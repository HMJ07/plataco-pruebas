// backend/routes/orders.js
import { Router } from 'express';
import { query } from './db.js';
import { requireAuth } from './middleware_auth.js';

const router = Router();

// ── GET /api/orders — Pedidos del usuario autenticado ──────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT o.id, o.status, o.total_eur, o.currency, o.total_customer_currency,
             o.created_at, o.tracking_number,
             p.status AS payment_status,
             (SELECT COUNT(*) FROM order_items WHERE order_id=o.id) AS item_count
      FROM orders o
      LEFT JOIN payments p ON p.order_id=o.id
      WHERE o.user_id=$1
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/:id — Detalle de un pedido ─────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const orderResult = await query(`
      SELECT o.*, p.status AS payment_status, p.card_brand, p.card_last4, p.amount_eur
      FROM orders o
      LEFT JOIN payments p ON p.order_id=o.id
      WHERE o.id=$1 AND o.user_id=$2
    `, [req.params.id, req.user.id]);

    if (!orderResult.rows[0]) return res.status(404).json({ error: 'Pedido no encontrado' });

    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id=$1',
      [req.params.id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
