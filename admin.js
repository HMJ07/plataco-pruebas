// backend/routes/admin.js
import { Router } from 'express';
import { query } from './db.js';
import { requireAdmin } from './middleware_auth.js';

const router = Router();
router.use(requireAdmin); // Todas las rutas requieren rol admin

// ── GET /api/admin/dashboard ───────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [orders, revenue, products, customers] = await Promise.all([
      query(`SELECT COUNT(*) FROM orders WHERE status='paid'`),
      query(`SELECT COALESCE(SUM(total_eur),0) AS total FROM orders WHERE status IN ('paid','processing','shipped','delivered')`),
      query(`SELECT COUNT(*) FROM products WHERE is_active=TRUE`),
      query(`SELECT COUNT(*) FROM users WHERE role='customer'`),
    ]);

    const recentOrders = await query(`
      SELECT o.id, o.status, o.total_eur, o.currency, o.created_at,
             u.email, u.first_name, u.last_name,
             o.guest_email
      FROM orders o
      LEFT JOIN users u ON u.id=o.user_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: {
        total_orders:   parseInt(orders.rows[0].count),
        total_revenue:  parseFloat(revenue.rows[0].total),
        active_products: parseInt(products.rows[0].count),
        total_customers: parseInt(customers.rows[0].count),
      },
      recent_orders: recentOrders.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/products ────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, c.name AS category_name
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/products ───────────────────────────────
router.post('/products', async (req, res) => {
  try {
    const { name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured } = req.body;
    const result = await query(`
      INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [name, slug, description, material, price_eur, stock || 0, category_id, badge, weight_grams, purity || '925', finish, is_featured || false]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/products/:id ────────────────────────────
router.put('/products/:id', async (req, res) => {
  try {
    const { name, description, material, price_eur, stock, badge, is_active, is_featured } = req.body;
    const result = await query(`
      UPDATE products SET name=$1, description=$2, material=$3, price_eur=$4,
        stock=$5, badge=$6, is_active=$7, is_featured=$8
      WHERE id=$9 RETURNING *
    `, [name, description, material, price_eur, stock, badge, is_active, is_featured, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/orders ──────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let where = '';
    if (status) { params.unshift(status); where = `WHERE o.status=$1`; }

    const result = await query(`
      SELECT o.id, o.status, o.total_eur, o.currency, o.created_at,
             o.ship_first_name, o.ship_last_name, o.ship_country,
             o.tracking_number, u.email, o.guest_email,
             p.status AS payment_status
      FROM orders o
      LEFT JOIN users u ON u.id=o.user_id
      LEFT JOIN payments p ON p.order_id=o.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/orders/:id — Detalle completo de un pedido ─
router.get('/orders/:id', async (req, res) => {
  try {
    const orderResult = await query(`
      SELECT
        o.*,
        u.email        AS user_email,
        u.first_name   AS user_first_name,
        u.last_name    AS user_last_name,
        u.phone        AS user_phone,
        p.status       AS payment_status,
        p.stripe_payment_intent_id,
        p.stripe_charge_id,
        p.amount_eur   AS payment_amount_eur,
        p.currency     AS payment_currency,
        p.payment_method,
        p.card_brand,
        p.card_last4,
        p.failure_message,
        p.refund_amount_eur,
        p.created_at   AS payment_created_at
      FROM orders o
      LEFT JOIN users u    ON u.id = o.user_id
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.id = $1
    `, [req.params.id]);

    if (!orderResult.rows[0]) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const itemsResult = await query(`
      SELECT
        oi.*,
        p.name         AS current_product_name,
        p.slug         AS product_slug,
        p.is_active    AS product_is_active
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `, [req.params.id]);

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/orders/:id/status ──────────────────────
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status, tracking_number } = req.body;
    const validStatuses = ['pending','paid','processing','shipped','delivered','cancelled','refunded'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

    const result = await query(`
      UPDATE orders SET status=$1, tracking_number=$2,
        shipped_at = CASE WHEN $1='shipped' THEN NOW() ELSE shipped_at END,
        delivered_at = CASE WHEN $1='delivered' THEN NOW() ELSE delivered_at END
      WHERE id=$3 RETURNING *
    `, [status, tracking_number || null, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
