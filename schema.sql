-- ============================================================
-- PLATACO — Base de datos completa
-- Motor: PostgreSQL 15+ (compatible con MySQL con pequeños ajustes)
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USUARIOS / CLIENTES
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,         -- bcrypt hash, nunca texto plano
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  phone         VARCHAR(30),
  role          VARCHAR(20) DEFAULT 'customer', -- 'customer' | 'admin'
  email_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR(100),              -- ID de cliente en Stripe
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DIRECCIONES DE ENVÍO
-- ============================================================
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  alias       VARCHAR(50) DEFAULT 'Casa',      -- 'Casa', 'Trabajo', etc.
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  address1    VARCHAR(255) NOT NULL,
  address2    VARCHAR(255),
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country     CHAR(2) NOT NULL,                -- ISO 3166-1 alpha-2 (ES, US, FR...)
  phone       VARCHAR(30),
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORÍAS DE PRODUCTO
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,    -- 'anillos', 'collares', etc.
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Anillos',    'anillos',    1),
  ('Collares',   'collares',   2),
  ('Pulseras',   'pulseras',   3),
  ('Pendientes', 'pendientes', 4),
  ('Broches',    'broches',    5);

-- ============================================================
-- PRODUCTOS (JOYAS)
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID REFERENCES categories(id),
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) UNIQUE NOT NULL,
  description   TEXT,
  material      VARCHAR(200),                  -- 'Plata 925 · Acabado pulido'
  price_eur     NUMERIC(10,2) NOT NULL,        -- Precio base en EUR
  stock         INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  is_featured   BOOLEAN DEFAULT FALSE,
  badge         VARCHAR(50),                   -- 'Bestseller', 'New', etc.
  weight_grams  NUMERIC(6,2),
  purity        VARCHAR(20) DEFAULT '925',     -- Pureza de la plata
  finish        VARCHAR(100),                  -- 'Pulido espejo', 'Satinado'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IMÁGENES DE PRODUCTO
-- ============================================================
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt         VARCHAR(255),
  sort_order  INTEGER DEFAULT 0,
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VARIANTES (TALLAS, TAMAÑOS)
-- ============================================================
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,           -- '12', 'M (17cm)', '45mm', etc.
  stock       INTEGER DEFAULT 0,
  price_extra NUMERIC(10,2) DEFAULT 0,         -- Incremento sobre precio base
  sort_order  INTEGER DEFAULT 0
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES users(id),
  guest_email         VARCHAR(255),            -- Para compras sin cuenta
  status              VARCHAR(30) DEFAULT 'pending',
  -- Estados: pending | paid | processing | shipped | delivered | cancelled | refunded

  -- Totales
  subtotal_eur        NUMERIC(10,2) NOT NULL,
  shipping_eur        NUMERIC(10,2) DEFAULT 0,
  tax_eur             NUMERIC(10,2) DEFAULT 0,
  total_eur           NUMERIC(10,2) NOT NULL,

  -- Divisa del cliente
  currency            CHAR(3) DEFAULT 'EUR',
  total_customer_currency NUMERIC(12,2),
  exchange_rate       NUMERIC(10,6) DEFAULT 1,

  -- Dirección de envío (copia en el momento del pedido)
  ship_first_name     VARCHAR(100),
  ship_last_name      VARCHAR(100),
  ship_address1       VARCHAR(255),
  ship_address2       VARCHAR(255),
  ship_city           VARCHAR(100),
  ship_state          VARCHAR(100),
  ship_postal_code    VARCHAR(20),
  ship_country        CHAR(2),
  ship_phone          VARCHAR(30),

  -- Seguimiento
  tracking_number     VARCHAR(200),
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  notes               TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LÍNEAS DE PEDIDO
-- ============================================================
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),
  product_variant_id UUID REFERENCES product_variants(id),

  -- Snapshot del producto en el momento de la compra
  product_name      VARCHAR(200) NOT NULL,
  variant_name      VARCHAR(100),
  unit_price_eur    NUMERIC(10,2) NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  subtotal_eur      NUMERIC(10,2) NOT NULL,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAGOS (INTEGRACIÓN STRIPE)
-- ============================================================
CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID REFERENCES orders(id),
  stripe_payment_intent_id VARCHAR(200) UNIQUE,  -- pi_xxxxx
  stripe_charge_id        VARCHAR(200),           -- ch_xxxxx
  amount_eur              NUMERIC(10,2) NOT NULL,
  currency                CHAR(3) NOT NULL,
  status                  VARCHAR(30) DEFAULT 'pending',
  -- Estados: pending | succeeded | failed | refunded | partially_refunded
  payment_method          VARCHAR(50),            -- 'card', 'paypal', etc.
  card_brand              VARCHAR(20),            -- 'visa', 'mastercard'
  card_last4              VARCHAR(4),
  failure_code            VARCHAR(100),
  failure_message         TEXT,
  refund_amount_eur       NUMERIC(10,2),
  metadata                JSONB,                  -- Datos extra de Stripe
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEBHOOKS DE STRIPE (log de eventos recibidos)
-- ============================================================
CREATE TABLE stripe_webhooks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    VARCHAR(200) UNIQUE NOT NULL,    -- evt_xxxxx
  event_type  VARCHAR(100) NOT NULL,           -- 'payment_intent.succeeded'
  payload     JSONB NOT NULL,
  processed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CARRITO (sesiones persistentes)
-- ============================================================
CREATE TABLE cart_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  session_key VARCHAR(200),                    -- Para usuarios no registrados
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_session_id     UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id),
  product_variant_id  UUID REFERENCES product_variants(id),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  added_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_session_id, product_id, product_variant_id)
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_active      ON products(is_active);
CREATE INDEX idx_orders_user          ON orders(user_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_payments_order       ON payments(order_id);
CREATE INDEX idx_payments_stripe_pi   ON payments(stripe_payment_intent_id);
CREATE INDEX idx_cart_items_session   ON cart_items(cart_session_id);
CREATE INDEX idx_order_items_order    ON order_items(order_id);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
