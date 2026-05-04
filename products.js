// backend/routes/products.js
import { Router } from 'express';
import { query } from './db.js';

const router = Router();

// ── GET /api/products ──────────────────────────────────────
// Soporta: ?category=anillos&search=collar&sort=price_asc&page=1&limit=12
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'created_at_desc', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['p.is_active = TRUE'];

    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.material ILIKE $${params.length})`);
    }

    const sortMap = {
      price_asc:        'p.price_eur ASC',
      price_desc:       'p.price_eur DESC',
      created_at_desc:  'p.created_at DESC',
      name_asc:         'p.name ASC',
    };
    const orderBy = sortMap[sort] || 'p.created_at DESC';
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit), offset);

    const sql = `
      SELECT
        p.id, p.name, p.slug, p.description, p.material,
        p.price_eur, p.stock, p.badge, p.is_featured,
        p.weight_grams, p.purity, p.finish,
        c.name AS category_name, c.slug AS category_slug,
        (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) AS image_url,
        (SELECT json_agg(json_build_object('id',pv.id,'name',pv.name,'stock',pv.stock,'price_extra',pv.price_extra) ORDER BY pv.sort_order)
         FROM product_variants pv WHERE pv.product_id=p.id) AS variants,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countSql = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
    `;

    const [products, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2)),
    ]);

    res.json({
      products: products.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/products/categories/all ──────────────────────
router.get('/categories/all', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
      GROUP BY c.id ORDER BY c.sort_order
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/products/:slug ────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.*,
        c.name AS category_name, c.slug AS category_slug,
        json_agg(DISTINCT jsonb_build_object('id',pi.id,'url',pi.url,'alt',pi.alt,'sort_order',pi.sort_order,'is_primary',pi.is_primary)) AS images,
        json_agg(DISTINCT jsonb_build_object('id',pv.id,'name',pv.name,'stock',pv.stock,'price_extra',pv.price_extra)) AS variants
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      WHERE p.slug = $1 AND p.is_active = TRUE
      GROUP BY p.id, c.name, c.slug
    `, [req.params.slug]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
