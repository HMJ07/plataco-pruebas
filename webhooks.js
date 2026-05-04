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
import { sendOrderConfirmationEmail } from './email.js';

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
      // Enviar email de confirmación del pedido
      try {
        const orderRes = await query(`
          SELECT o.* FROM orders o
          JOIN payments p ON p.order_id = o.id
          WHERE p.stripe_payment_intent_id = $1
        `, [pi.id]);
        const order = orderRes.rows[0];
        if (order) {
          let toEmail = order.guest_email;
          if (!toEmail && order.user_id) {
            const userRes = await query('SELECT email FROM users WHERE id=$1', [order.user_id]);
            toEmail = userRes.rows[0]?.email;
          }
          if (toEmail) {
            const itemsRes = await query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
            sendOrderConfirmationEmail(order, itemsRes.rows, toEmail).catch(console.error);
          }
        }
      } catch (emailErr) {
        console.error('Error enviando email en webhook:', emailErr);
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