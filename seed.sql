-- ============================================================
-- PLATACO — Datos de ejemplo (productos, variantes)
-- ============================================================

-- Anillos
INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Anillo Infinito', 'anillo-infinito', 'Anillo de banda continua símbolo del infinito. Diseño minimalista de línea pura, perfecto para apilar o llevar solo. Ideal para uso diario por su resistencia y comodidad.', 'Plata 925 · Acabado pulido', 42.00, 50, id, NULL, 3.2, '925', 'Pulido espejo', true, true FROM categories WHERE slug='anillos';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Anillo Sello Oval', 'anillo-sello-oval', 'Anillo sello con chatón oval liso, perfecto para grabar iniciales o un diseño personalizado. Estructura sólida con acabado satinado en la banda.', 'Plata 925 · Sello macizo', 89.00, 20, id, NULL, 8.5, '925', 'Satinado', false, true FROM categories WHERE slug='anillos';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Anillo Apilable Texturizado', 'anillo-apilable-texturizado', 'Anillo fino con textura martillada a mano. Perfecto para combinar con otros anillos. Su acabado rústico contrasta bellamente con piezas lisas.', 'Plata 925 · Textura martillada', 28.00, 80, id, NULL, 1.8, '925', 'Martillado', false, true FROM categories WHERE slug='anillos';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Anillo Medio Dedo Open', 'anillo-medio-dedo-open', 'Anillo de media falange con diseño abierto ajustable. Se coloca en la falange media del dedo. Delicado y moderno, ideal para llevar en capas.', 'Plata 925 · Abierto ajustable', 33.00, 40, id, NULL, 2.0, '925', 'Pulido', false, true FROM categories WHERE slug='anillos';

-- Collares
INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Collar Luna Creciente', 'collar-luna-creciente', 'Delicado colgante en forma de luna creciente con textura martillada que captura la luz de manera única. Cadena tipo Singapur incluida. Cierre de mosquetón.', 'Plata 925 · Cadena fina 45cm', 68.00, 35, id, 'Bestseller', 4.1, '925', 'Martillado', true, true FROM categories WHERE slug='collares';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Collar Gargantilla Twist', 'collar-gargantilla-twist', 'Gargantilla rígida con diseño trenzado trabajado a mano. Se adapta al cuello y puede abrirse ligeramente. Acabado brillante que refleja la luz con elegancia.', 'Plata 925 · Trenzado a mano', 92.00, 15, id, 'New', 22.0, '925', 'Pulido espejo', true, true FROM categories WHERE slug='collares';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Collar Perlas de Plata', 'collar-perlas-plata', 'Collar de bolas de plata perfectamente esféricas ensartadas en hilo de acero inoxidable. Cierre de tornillo también en plata. Elegante y versátil.', 'Plata 925 · Bolas 4mm', 75.00, 25, id, NULL, 14.0, '925', 'Pulido', false, true FROM categories WHERE slug='collares';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Collar Cadena Anchor', 'collar-cadena-anchor', 'Collar de cadena anchor (ancla) de eslabones ovalados en relieve. Aspecto robusto pero ligero. Compatible con cualquier colgante de argolla.', 'Plata 925 · Cadena marinera', 58.00, 30, id, NULL, 18.0, '925', 'Pulido', false, true FROM categories WHERE slug='collares';

-- Pulseras
INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pulsera Esclava Grabada', 'pulsera-esclava-grabada', 'Pulsera tipo esclava con diseño de hojas grabadas a láser. Apertura lateral con bisagra y cierre de seguridad. Posibilidad de personalización bajo pedido.', 'Plata 925 · Grabado láser', 54.00, 30, id, 'New', 12.0, '925', 'Satinado', false, true FROM categories WHERE slug='pulseras';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pulsera Cadena Figaro', 'pulsera-cadena-figaro', 'Pulsera de cadena Figaro clásica en plata de ley. Eslabones alternados 3+1 con cierre de mosquetón. Disponible en diferentes longitudes.', 'Plata 925 · Cadena italiana', 38.00, 45, id, NULL, 6.0, '925', 'Pulido', false, true FROM categories WHERE slug='pulseras';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pulsera Charm Corazón', 'pulsera-charm-corazon', 'Pulsera de cadena rolo con charm de corazón sólido. Posibilidad de añadir más charms. Cierre de mosquetón con seguro.', 'Plata 925 · Cadena Rolo', 48.00, 35, id, NULL, 5.5, '925', 'Pulido', false, true FROM categories WHERE slug='pulseras';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pulsera Tejida Macramé Plata', 'pulsera-tejida-macrame-plata', 'Pulsera artesanal tejida en hilo de plata con técnica macramé. Pieza única y artesanal. Cierre de bola deslizante.', 'Plata 925 · Hilo de plata', 82.00, 12, id, 'New', 7.0, '925', 'Mate artesanal', true, true FROM categories WHERE slug='pulseras';

-- Pendientes
INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pendientes Aro Liso', 'pendientes-aro-liso', 'Aros clásicos en plata pulida de 25mm de diámetro. Cierre de presión italiano de alta seguridad. Ligeros y cómodos para uso prolongado.', 'Plata 925 · Cierre italiano', 35.00, 40, id, NULL, 2.8, '925', 'Pulido espejo', false, true FROM categories WHERE slug='pendientes';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pendientes Lágrima Calada', 'pendientes-lagrima-calada', 'Pendientes en forma de lágrima con intrincado diseño calado en filigrana geométrica. Livianos pese a su tamaño gracias a la técnica de vaciado.', 'Plata 925 · Trabajo calado', 47.00, 25, id, NULL, 1.9, '925', 'Filigrana', false, true FROM categories WHERE slug='pendientes';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Pendientes Ear Cuff', 'pendientes-ear-cuff', 'Ear cuffs en plata que se colocan en el hélix de la oreja sin necesidad de perforación. Diseño geométrico ajustable. Se venden por unidad.', 'Plata 925 · Sin pendiente', 29.00, 60, id, 'New', 1.2, '925', 'Pulido', false, true FROM categories WHERE slug='pendientes';

-- Broches
INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Broche Nudo Celta', 'broche-nudo-celta', 'Broche decorativo con motivo de nudo celta triquetra. Cierre de presión con seguro trasero. Ideal para chales, bufandas o como broche de solapa.', 'Plata 925 · Fundición', 62.00, 20, id, NULL, 9.0, '925', 'Satinado', false, true FROM categories WHERE slug='broches';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Broche Hoja Botánico', 'broche-hoja-botanico', 'Elegante broche en forma de hoja con venas finamente grabadas. Acabado en rodio para mayor durabilidad y brillo permanente. Cierre de aguja con tope.', 'Plata 925 · Bañado rodio', 44.00, 25, id, NULL, 6.0, '925', 'Rodio', false, true FROM categories WHERE slug='broches';

INSERT INTO products (name, slug, description, material, price_eur, stock, category_id, badge, weight_grams, purity, finish, is_featured, is_active)
SELECT 'Broche Mariposa Articulado', 'broche-mariposa-articulado', 'Broche mariposa con alas articuladas que se mueven sutilmente. Cuerpo en plata maciza con alas caladas. Cierre doble de seguridad.', 'Plata 925 · Articulado', 77.00, 10, id, NULL, 11.0, '925', 'Combinado', false, true FROM categories WHERE slug='broches';

-- ── Variantes de talla ─────────────────────────────────────

-- Anillo Infinito - tallas
WITH p AS (SELECT id FROM products WHERE slug='anillo-infinito')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 10, t.ord FROM p,
  (VALUES ('12',1),('13',2),('14',3),('15',4),('16',5),('17',6),('18',7),('19',8)) AS t(name,ord);

-- Anillo Sello Oval - tallas
WITH p AS (SELECT id FROM products WHERE slug='anillo-sello-oval')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 5, t.ord FROM p,
  (VALUES ('12',1),('13',2),('14',3),('15',4),('16',5),('17',6),('18',7),('19',8),('20',9)) AS t(name,ord);

-- Anillo Apilable - tallas
WITH p AS (SELECT id FROM products WHERE slug='anillo-apilable-texturizado')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 15, t.ord FROM p,
  (VALUES ('12',1),('13',2),('14',3),('15',4),('16',5),('17',6),('18',7)) AS t(name,ord);

-- Anillo Medio Dedo - tallas ajustables
WITH p AS (SELECT id FROM products WHERE slug='anillo-medio-dedo-open')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 15, t.ord FROM p,
  (VALUES ('Ajustable S',1),('Ajustable M',2),('Ajustable L',3)) AS t(name,ord);

-- Pulsera Esclava - tallas
WITH p AS (SELECT id FROM products WHERE slug='pulsera-esclava-grabada')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 8, t.ord FROM p,
  (VALUES ('XS (15cm)',1),('S (16cm)',2),('M (17cm)',3),('L (18cm)',4)) AS t(name,ord);

-- Pulsera Cadena Figaro - longitudes
WITH p AS (SELECT id FROM products WHERE slug='pulsera-cadena-figaro')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 10, t.ord FROM p,
  (VALUES ('16cm',1),('17cm',2),('18cm',3),('19cm',4),('20cm',5)) AS t(name,ord);

-- Pulsera Charm Corazón - longitudes
WITH p AS (SELECT id FROM products WHERE slug='pulsera-charm-corazon')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 10, t.ord FROM p,
  (VALUES ('16cm',1),('17cm',2),('18cm',3),('19cm',4)) AS t(name,ord);

-- Pulsera Macramé - tallas
WITH p AS (SELECT id FROM products WHERE slug='pulsera-tejida-macrame-plata')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 3, t.ord FROM p,
  (VALUES ('XS',1),('S',2),('M',3),('L',4),('XL',5)) AS t(name,ord);

-- Pendientes Aro - tamaños
WITH p AS (SELECT id FROM products WHERE slug='pendientes-aro-liso')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 15, t.ord FROM p,
  (VALUES ('25mm',1),('30mm',2),('40mm',3)) AS t(name,ord);

-- Pendientes Lágrima - tamaños
WITH p AS (SELECT id FROM products WHERE slug='pendientes-lagrima-calada')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, t.name, 12, t.ord FROM p,
  (VALUES ('Pequeño',1),('Mediano',2)) AS t(name,ord);

-- Pendientes Ear Cuff - ajustable
WITH p AS (SELECT id FROM products WHERE slug='pendientes-ear-cuff')
INSERT INTO product_variants (product_id, name, stock, sort_order)
SELECT p.id, 'Ajustable', 60, 1 FROM p;

-- ── Usuario admin de prueba ────────────────────────────────
-- Contraseña: Admin1234! (bcrypt hash generado con cost=12)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES (
  'admin@plataco.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/o8nO6YtdK',
  'Admin',
  'PLATACO',
  'admin',
  true
);
