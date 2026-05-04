# PLATACO — Backend API

Backend completo para tienda de joyería en plata. Node.js + Express + PostgreSQL + Stripe.

---

## Estructura del proyecto

```
backend/
├── server.js              ← Punto de entrada, Express + middlewares
├── db.js                  ← Pool de conexiones PostgreSQL
├── schema.sql             ← Esquema completo de la base de datos
├── package.json
├── .env                   ← Variables de entorno (NO subir a git)
├── .env.example           ← Plantilla de variables
├── middleware/
│   └── auth.js            ← requireAuth / requireAdmin (JWT)
└── routes/
    ├── auth.js            ← /api/auth  (register, login, me)
    ├── products.js        ← /api/products
    ├── orders.js          ← /api/orders
    ├── payments.js        ← /api/payments (Stripe)
    ├── admin.js           ← /api/admin (panel administración)
    └── webhooks.js        ← /api/webhooks/stripe
```

---

## Instalación paso a paso

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y rellena:
- `DATABASE_URL` con tu usuario, contraseña y nombre de base de datos
- `JWT_SECRET` con una cadena aleatoria larga
- `STRIPE_SECRET_KEY` con tu clave de Stripe (empieza con `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` con el secreto del webhook de Stripe

Generar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Crear la base de datos

```bash
# Crea la base de datos en PostgreSQL
psql -U hugo -c "CREATE DATABASE plataco;"

# Ejecuta el esquema (crea todas las tablas)
psql -U hugo -d plataco -f schema.sql
```

O usando la variable de entorno:
```bash
npm run db:init
```

### 4. Arrancar el servidor

```bash
# Producción
npm start

# Desarrollo (con recarga automática, Node 18+)
npm run dev
```

El servidor arranca en `http://localhost:4000`

---

## Endpoints de la API

### Auth — `/api/auth`
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register` | ❌ | Crear cuenta |
| POST | `/login` | ❌ | Iniciar sesión → devuelve JWT |
| GET | `/me` | ✅ | Ver perfil |
| PUT | `/me` | ✅ | Editar perfil |

### Productos — `/api/products`
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ❌ | Listar productos (`?category=anillos&search=...&sort=price_asc&page=1`) |
| GET | `/:slug` | ❌ | Detalle de producto |
| GET | `/categories/all` | ❌ | Todas las categorías |

### Pedidos — `/api/orders`
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ✅ | Mis pedidos |
| GET | `/:id` | ✅ | Detalle de un pedido |

### Pagos — `/api/payments`
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/create-intent` | ❌ | Crear PaymentIntent en Stripe |
| POST | `/confirm-order` | ❌ | Confirmar pedido tras pago |
| GET | `/order/:id` | ✅ | Ver pedido con info de pago |

### Admin — `/api/admin` *(requiere rol admin)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Estadísticas generales |
| GET | `/products` | Todos los productos |
| POST | `/products` | Crear producto |
| PUT | `/products/:id` | Editar producto |
| GET | `/orders` | Todos los pedidos (`?status=paid&page=1`) |
| PUT | `/orders/:id/status` | Cambiar estado del pedido |

### Webhooks — `/api/webhooks`
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/stripe` | Recibe eventos de Stripe |

---

## Flujo de pago (Stripe)

1. Frontend llama `POST /api/payments/create-intent` con los items del carrito
2. Backend verifica precios en DB, crea un `PaymentIntent` en Stripe
3. Frontend usa `client_secret` para mostrar el formulario de pago de Stripe
4. Stripe confirma el pago en el navegador
5. Frontend llama `POST /api/payments/confirm-order` con el `payment_intent_id`
6. Backend verifica con Stripe que el pago fue exitoso y crea el pedido en DB

---

## Webhooks de Stripe (producción)

Para que Stripe notifique al backend de eventos asíncronos:

```bash
# Instalar Stripe CLI
stripe login
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Eventos que maneja:
- `payment_intent.succeeded` → marca pago como completado
- `payment_intent.payment_failed` → registra el fallo
- `charge.refunded` → procesa reembolso y actualiza pedido

---

## Crear primer admin

Después de registrar un usuario normal, actualiza su rol en la DB:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

---

## Tecnologías

- **Node.js** + **Express** — servidor HTTP
- **PostgreSQL** — base de datos
- **bcryptjs** — hash de contraseñas
- **jsonwebtoken** — autenticación JWT
- **Stripe** — pasarela de pago
- **helmet** — cabeceras de seguridad HTTP
- **cors** — control de orígenes cruzados
