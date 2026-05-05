// backend/routes/payments.js
// ============================================================
// Integración completa con Stripe
// ============================================================
import { Router } from 'express';
import Stripe from 'stripe';
import { query, withTransaction } from './db.js';
import { requireAuth } from './middleware_auth.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Tipos de cambio aproximados (en producción usa una API de divisas en tiempo real)
const EXCHANGE_RATES = { EUR: 1, USD: 1.08, GBP: 0.86, JPY: 163.2, CAD: 1.47, AUD: 1.65, CHF: 0.97 };

// ── POST /api/payments/create-intent ──────────────────────
// El frontend llama a esto ANTES de mostrar el formulario de tarjeta.
// Devuelve un client_secret que Stripe.js usa para confirmar el pago.
router.post('/create-intent', async (req, res) => {
  try {
    const { items, currency = 'EUR', shipping_address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Calcular total verificando precios desde la base de datos (NUNCA confiar en el cliente)
    let total_eur = 0;
    const validatedItems = [];

    for (const item of items) {
      const productResult = await query(
        'SELECT id, name, price_eur, stock FROM products WHERE id=$1 AND is_active=TRUE',
        [item.product_id]
      );
      const product = productResult.rows[0];
      if (!product) return res.status(400).json({ error: `Producto no encontrado: ${item.product_id}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente: ${product.name}` });
      }

      let price_eur = parseFloat(product.price_eur);

      // Añadir precio extra de variante si hay
      if (item.variant_id) {
        const varResult = await query(
          'SELECT price_extra FROM product_variants WHERE id=$1 AND product_id=$2',
          [item.variant_id, item.product_id]
        );
        if (varResult.rows[0]) price_eur += parseFloat(varResult.rows[0].price_extra);
      }

      const subtotal = price_eur * item.quantity;
      total_eur += subtotal;
      validatedItems.push({ ...item, product_name: product.name, unit_price_eur: price_eur, subtotal_eur: subtotal });
    }

    // Calcular envío
    const shipping_eur = total_eur >= 80 ? 0 : 6.95;
    total_eur += shipping_eur;

    // Convertir a la divisa del cliente
    const rate = EXCHANGE_RATES[currency] || 1;
    const total_customer = Math.round(total_eur * rate * 100); // en centavos

    // Crear PaymentIntent en Stripe
    // IMPORTANTE: Stripe limita cada campo de metadata a 500 chars.
    // Guardamos solo IDs+cantidades+precio (compacto). El nombre del
    // producto se recupera de la DB en confirm-order.
    const compactItems = validatedItems.map(i => ({
      pid: i.product_id,
      vid: i.variant_id || null,
      qty: i.quantity,
      eur: i.unit_price_eur,
    }));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total_customer,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        items_compact: JSON.stringify(compactItems),
        total_eur:     total_eur.toFixed(2),
        shipping_eur:  shipping_eur.toFixed(2),
        currency:      currency,
        exchange_rate: rate.toString(),
      },
    });

    res.json({
      client_secret:    paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      total_eur,
      shipping_eur,
      total_customer_currency: (total_customer / 100).toFixed(2),
      currency,
      validated_items: validatedItems,
    });

  } catch (err) {
    console.error('Error create-intent:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/confirm-order ──────────────────────
// Llamado por el frontend DESPUÉS de que Stripe confirma el pago.
// Crea el pedido en la base de datos.
router.post('/confirm-order', async (req, res) => {
  try {
    const {
      payment_intent_id,
      shipping_address,
      guest_email,
    } = req.body;

    // Verificar el pago con Stripe (no confiar en el cliente)
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'El pago no se ha completado' });
    }

    // Comprobar que no se ha procesado ya
    const existingPayment = await query(
      'SELECT id FROM payments WHERE stripe_payment_intent_id=$1',
      [payment_intent_id]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(409).json({ error: 'Este pago ya ha sido procesado' });
    }

    const meta = paymentIntent.metadata;
    // Reconstruir items desde el formato compacto (items_compact)
    // o desde el formato antiguo (items_json) para retrocompatibilidad
    let items;
    if (meta.items_compact) {
      const compact = JSON.parse(meta.items_compact);
      // Recuperar nombres de producto desde la DB
      items = await Promise.all(compact.map(async (c) => {
        const pr = await query('SELECT name FROM products WHERE id=$1', [c.pid]);
        let variant_name = null;
        if (c.vid) {
          const vr = await query('SELECT name FROM product_variants WHERE id=$1', [c.vid]);
          variant_name = vr.rows[0]?.name || null;
        }
        return {
          product_id:    c.pid,
          variant_id:    c.vid,
          product_name:  pr.rows[0]?.name || 'Producto',
          variant_name,
          quantity:      c.qty,
          unit_price_eur: c.eur,
        };
      }));
    } else {
      items = JSON.parse(meta.items_json);
    }
    const total_eur = parseFloat(meta.total_eur);
    const shipping_eur = parseFloat(meta.shipping_eur);
    const subtotal_eur = total_eur - shipping_eur;
    const user_id = req.user?.id || null;

    // Crear pedido y pago en una transacción
    const order = await withTransaction(async (client) => {
      // 1. Crear pedido
      const orderResult = await client.query(`
        INSERT INTO orders (
          user_id, guest_email, status,
          subtotal_eur, shipping_eur, total_eur,
          currency, total_customer_currency, exchange_rate,
          ship_first_name, ship_last_name, ship_address1, ship_address2,
          ship_city, ship_state, ship_postal_code, ship_country, ship_phone
        ) VALUES ($1,$2,'paid',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *
      `, [
        user_id, guest_email || null,
        subtotal_eur, shipping_eur, total_eur,
        meta.currency, parseFloat(meta.total_eur) * parseFloat(meta.exchange_rate), parseFloat(meta.exchange_rate),
        shipping_address.first_name, shipping_address.last_name,
        shipping_address.address1, shipping_address.address2 || null,
        shipping_address.city, shipping_address.state || null,
        shipping_address.postal_code, shipping_address.country, shipping_address.phone || null,
      ]);
      const order = orderResult.rows[0];

      // 2. Insertar líneas de pedido y descontar stock
      for (const item of items) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_variant_id, product_name, variant_name, unit_price_eur, quantity, subtotal_eur)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [
          order.id, item.product_id, item.variant_id || null,
          item.product_name, item.variant_name || null,
          item.unit_price_eur, item.quantity, item.unit_price_eur * item.quantity,
        ]);

        // Descontar stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // 3. Registrar el pago
      const charge = paymentIntent.latest_charge;
      await client.query(`
        INSERT INTO payments (order_id, stripe_payment_intent_id, stripe_charge_id, amount_eur, currency, status, payment_method)
        VALUES ($1,$2,$3,$4,$5,'succeeded',$6)
      `, [order.id, payment_intent_id, charge || null, total_eur, meta.currency, 'card']);

      return order;
    });

    res.json({
      success: true,
      order_id: order.id,
      message: 'Pedido creado correctamente',
    });

  } catch (err) {
    console.error('Error confirm-order:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/order/:id ────────────────────────────
router.get('/order/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT o.*, p.status AS payment_status, p.card_brand, p.card_last4,
        json_agg(json_build_object(
          'product_name',oi.product_name,
          'variant_name',oi.variant_name,
          'quantity',oi.quantity,
          'unit_price_eur',oi.unit_price_eur,
          'subtotal_eur',oi.subtotal_eur
        )) AS items
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id=$1 AND (o.user_id=$2 OR $3='admin')
      GROUP BY o.id, p.status, p.card_brand, p.card_last4
    `, [req.params.id, req.user.id, req.user.role]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
