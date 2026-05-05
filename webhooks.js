// backend/routes/webhooks.js
// ============================================================
// Stripe envía eventos a esta URL cuando pasan cosas:
//   - Pago confirmado (payment_intent.succeeded)
//   - Pago fallido (payment_intent.payment_failed)
//   - Reembolso (charge.refunded)
// IMPORTANTE: Esta ruta recibe el body en RAW (sin parse JSON).
// Está configurado en server.js con express.raw()
// ============================================================
import { Router } from 'express';
import Stripe from 'stripe';
import { query } from './db.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Verificar que el evento viene realmente de Stripe (no un atacante)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature inválida:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Guardar el evento para auditoría (evitar duplicados con ON CONFLICT)
  try {
    await query(`
      INSERT INTO stripe_webhooks (event_id, event_type, payload)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id) DO NOTHING
    `, [event.id, event.type, JSON.stringify(event.data)]);
  } catch (err) {
    console.error('Error guardando webhook:', err);
  }

  // Procesar según el tipo de evento
  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      await query(
        `UPDATE payments SET status='succeeded' WHERE stripe_payment_intent_id=$1`,
        [pi.id]
      );
      console.log(`✅ Pago confirmado: ${pi.id} — ${pi.amount / 100} ${pi.currency.toUpperCase()}`);

      // Enviar email de confirmación al cliente
      try {
        // Recuperar datos del pedido
        const orderResult = await query(`
          SELECT o.*,
                 u.email AS user_email,
                 json_agg(json_build_object(
                   'product_name', oi.product_name,
                   'variant_name', oi.variant_name,
                   'quantity',     oi.quantity,
                   'unit_price_eur', oi.unit_price_eur,
                   'subtotal_eur', oi.subtotal_eur
                 )) AS items
          FROM orders o
          LEFT JOIN users u ON u.id = o.user_id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.id = (
            SELECT order_id FROM payments WHERE stripe_payment_intent_id = $1
          )
          GROUP BY o.id, u.email
        `, [pi.id]);

        const order = orderResult.rows[0];
        if (order) {
          const clientEmail = order.user_email || order.guest_email;
          const clientName  = order.ship_first_name || 'Cliente';
          const shortId     = order.id.slice(-8).toUpperCase();

          const itemsHtml = (order.items || []).map(i => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f0ede8">
                ${i.product_name}${i.variant_name ? ` <span style="color:#888;font-size:0.85em">(${i.variant_name})</span>` : ''}
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;text-align:center">${i.quantity}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;text-align:right">€${parseFloat(i.subtotal_eur).toFixed(2)}</td>
            </tr>`).join('');

          const shippingFree = parseFloat(order.shipping_eur || 0) === 0;
          const shippingHtml = shippingFree
            ? `<span style="color:#2d7d46">GRATIS</span>`
            : `€${parseFloat(order.shipping_eur).toFixed(2)}`;

          await resend.emails.send({
            from:    process.env.EMAIL_FROM || 'PLATACO <pedidos@plataco.com>',
            to:      clientEmail,
            subject: `✅ Pedido confirmado #${shortId} — PLATACO`,
            html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f2;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f2;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd8">

        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:28px 36px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:1.6rem;letter-spacing:0.15em;font-weight:700">PLATACO</h1>
          <p style="color:#c4a882;margin:4px 0 0;font-size:0.75rem;letter-spacing:0.1em">JOYERÍA EN PLATA</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 36px 24px">
          <p style="margin:0 0 6px;color:#6b7280;font-size:0.85rem">Hola, <strong style="color:#1a1a1a">${clientName}</strong></p>
          <h2 style="margin:0 0 20px;font-size:1.2rem;color:#1a1a1a">Tu pedido ha sido confirmado 🎉</h2>
          <p style="margin:0 0 20px;color:#555;font-size:0.9rem;line-height:1.6">
            Hemos recibido tu pedido y ya estamos preparándolo con todo el cariño.
            Te avisaremos cuando sea enviado.
          </p>

          <!-- Order ID -->
          <div style="background:#faf9f7;border:1px solid #e0ddd8;border-radius:8px;padding:14px 18px;margin-bottom:24px;text-align:center">
            <span style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.08em">Nº de pedido</span>
            <div style="font-size:1.1rem;font-weight:700;color:#8b7355;font-family:monospace;margin-top:4px">#${shortId}</div>
          </div>

          <!-- Items -->
          <h3 style="font-size:0.85rem;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px">Resumen del pedido</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0ddd8;border-radius:8px;overflow:hidden;margin-bottom:8px">
            <thead>
              <tr style="background:#faf9f7">
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;color:#888;font-weight:600">Producto</th>
                <th style="padding:10px 12px;text-align:center;font-size:0.75rem;color:#888;font-weight:600">Cant.</th>
                <th style="padding:10px 12px;text-align:right;font-size:0.75rem;color:#888;font-weight:600">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:8px 12px;text-align:right;font-size:0.83rem;color:#888">Subtotal</td>
                <td style="padding:8px 12px;text-align:right;font-size:0.83rem">€${parseFloat(order.subtotal_eur).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:8px 12px;text-align:right;font-size:0.83rem;color:#888">Envío</td>
                <td style="padding:8px 12px;text-align:right;font-size:0.83rem">${shippingHtml}</td>
              </tr>
              <tr style="background:#faf9f7">
                <td colspan="2" style="padding:12px;text-align:right;font-weight:700;font-size:0.95rem">Total</td>
                <td style="padding:12px;text-align:right;font-weight:700;font-size:0.95rem">€${parseFloat(order.total_eur).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Shipping address -->
          <h3 style="font-size:0.85rem;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 10px">Dirección de envío</h3>
          <div style="background:#faf9f7;border:1px solid #e0ddd8;border-radius:8px;padding:14px 18px;font-size:0.88rem;color:#444;line-height:1.7">
            ${order.ship_first_name} ${order.ship_last_name}<br>
            ${order.ship_address1}${order.ship_address2 ? ', ' + order.ship_address2 : ''}<br>
            ${order.ship_postal_code} ${order.ship_city}${order.ship_state ? ', ' + order.ship_state : ''}<br>
            ${order.ship_country}
            ${order.ship_phone ? '<br>' + order.ship_phone : ''}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#faf9f7;padding:20px 36px;text-align:center;border-top:1px solid #e0ddd8">
          <p style="margin:0;font-size:0.78rem;color:#999;line-height:1.6">
            Si tienes alguna pregunta sobre tu pedido, responde a este correo.<br>
            <strong style="color:#8b7355">PLATACO</strong> — Joyería artesanal en plata
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
          });
          console.log(`📧 Email de confirmación enviado a ${clientEmail}`);
        }
      } catch (emailErr) {
        // El error de email NO debe bloquear el flujo del pedido
        console.error('Error enviando email de confirmación:', emailErr.message);
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await query(
        `UPDATE payments SET status='failed', failure_message=$1 WHERE stripe_payment_intent_id=$2`,
        [pi.last_payment_error?.message || 'Pago fallido', pi.id]
      );
      console.log(`❌ Pago fallido: ${pi.id}`);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      const refundAmount = charge.amount_refunded / 100;
      await query(
        `UPDATE payments SET status='refunded', refund_amount_eur=$1 WHERE stripe_charge_id=$2`,
        [refundAmount, charge.id]
      );
      // Actualizar estado del pedido
      await query(`
        UPDATE orders SET status='refunded'
        WHERE id=(SELECT order_id FROM payments WHERE stripe_charge_id=$1)
      `, [charge.id]);
      console.log(`💸 Reembolso procesado: ${charge.id} — ${refundAmount}`);
      break;
    }

    default:
      console.log(`Evento Stripe no procesado: ${event.type}`);
  }

  // Siempre responder 200 a Stripe para confirmar recepción
  res.json({ received: true });
});

export default router;
