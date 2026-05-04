# PLATACO — Guía de despliegue completa
## De cero a funcional en ~30 minutos

---

## RESUMEN: Lo que vas a hacer

```
Tu PC (archivos) → GitHub → Railway (backend + BD) → Netlify (frontend)
```

- **Railway**: hosting del backend Node.js + base de datos PostgreSQL (gratis para empezar)
- **Netlify**: ya lo tienes, hosting del frontend (index.html + checkout.html)
- **Stripe**: pasarela de pago (gratis hasta que cobres)

---

## PASO 1 — Crear cuenta en Stripe (5 min)

1. Ve a **https://stripe.com/es** → "Comenzar ahora"
2. Confirma tu email
3. Ve al panel → **Desarrolladores** → **Claves de API**
4. Copia estas dos claves (las necesitas en el paso 3):
   - **Clave secreta**: `sk_test_51...` (la clave larga que empieza con sk_test_)
   - **Clave publicable**: `pk_test_51...`

> ⚠️ NO compartas nunca la clave secreta. La publicable sí puede estar en el frontend.

---

## PASO 2 — Subir el backend a GitHub (5 min)

1. Ve a **https://github.com** → New repository
2. Nómbralo `plataco-backend` → Create repository
3. En tu ordenador, abre una terminal en la carpeta `plataco-backend/`:

```bash
git init
git add .
git commit -m "Initial backend"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/plataco-backend.git
git push -u origin main
```

---

## PASO 3 — Desplegar en Railway (10 min)

### 3a. Crear el proyecto

1. Ve a **https://railway.app** → Login with GitHub
2. "New Project" → "Deploy from GitHub repo"
3. Selecciona `plataco-backend`
4. Railway detecta Node.js automáticamente → Deploy

### 3b. Añadir base de datos PostgreSQL

1. En tu proyecto Railway → "New" → "Database" → "PostgreSQL"
2. Railway crea la BD y añade `DATABASE_URL` automáticamente

### 3c. Configurar variables de entorno

En Railway → tu servicio backend → **Variables** → añade estas una a una:

| Variable | Valor |
|---|---|
| `FRONTEND_URLS` | `https://plataco.netlify.app` |
| `JWT_SECRET` | (genera uno abajo) |
| `STRIPE_SECRET_KEY` | `sk_test_51...` (tu clave secreta de Stripe) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_51...` (tu clave publicable) |
| `STRIPE_WEBHOOK_SECRET` | (lo añades en el paso 4) |
| `NODE_ENV` | `production` |

**Para generar JWT_SECRET** abre una terminal y ejecuta:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copia el resultado y pégalo como valor de `JWT_SECRET`.

### 3d. Obtener tu URL de Railway

Cuando acabe el despliegue verás algo como:
`https://plataco-backend-production-xxxx.railway.app`

**Guárdala, la necesitas en los pasos siguientes.**

---

## PASO 4 — Ejecutar la base de datos (3 min)

Railway tiene una consola SQL integrada. Ve a tu servicio **PostgreSQL** en Railway → **Data** → **Query**.

Copia y pega el contenido de `schema.sql` y haz clic en "Run".
Luego copia y pega el contenido de `seed.sql` y haz clic en "Run".

Alternativamente desde tu terminal (necesitas psql instalado):
```bash
psql "TU_DATABASE_URL_DE_RAILWAY" -f schema.sql
psql "TU_DATABASE_URL_DE_RAILWAY" -f seed.sql
```

---

## PASO 5 — Configurar webhook de Stripe (5 min)

1. Ve a **https://dashboard.stripe.com/webhooks**
2. "Add endpoint"
3. URL: `https://TU-BACKEND.railway.app/api/webhooks/stripe`
4. Eventos a escuchar: selecciona estos 3:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. "Add endpoint" → copia el **Secreto de firma** (`whsec_...`)
6. Vuelve a Railway → Variables → añade `STRIPE_WEBHOOK_SECRET` = `whsec_...`

---

## PASO 6 — Actualizar el frontend en Netlify (2 min)

Abre el archivo `config.js` de la carpeta `plataco-frontend/`:

```js
// Cambia esta línea con tu URL real de Railway:
window.PLATACO_API_URL = 'https://plataco-backend-production-xxxx.railway.app/api';
```

Luego sube a Netlify los 4 archivos actualizados:
- `index.html`
- `checkout.html`
- `config.js`
- `netlify.toml`

En **Netlify** → tu sitio → **Deploys** → arrastra la carpeta `plataco-frontend/` o usa Netlify CLI:

```bash
npm install -g netlify-cli
cd plataco-frontend
netlify deploy --prod
```

---

## PASO 7 — Verificar que todo funciona

### 7a. Comprobar el backend
Abre en el navegador:
```
https://TU-BACKEND.railway.app/api/health
```
Debe responder: `{"status":"ok","timestamp":"..."}`

### 7b. Comprobar los productos
```
https://TU-BACKEND.railway.app/api/products?limit=5
```
Debe devolver un JSON con 5 joyas.

### 7c. Probar un pago
1. Ve a **https://plataco.netlify.app**
2. Añade un producto al carrito
3. Haz clic en "Finalizar compra"
4. Usa la tarjeta de prueba de Stripe: `4242 4242 4242 4242`
   - Fecha: cualquier mes/año futuros (ej: 12/30)
   - CVV: cualquier 3 dígitos (ej: 123)
5. Completa el formulario → "Pagar"
6. Debes ver la pantalla de confirmación con número de pedido

### 7d. Verificar en Stripe
Ve a **https://dashboard.stripe.com/test/payments**
Verás el pago de prueba listado.

---

## Problemas comunes

**"No se pudo conectar con el backend"** en la tienda:
→ Revisa que `config.js` tenga la URL correcta de Railway
→ Revisa que en Railway → Variables esté `FRONTEND_URLS` con tu dominio de Netlify

**Error CORS**:
→ En Railway añade tu URL de Netlify a `FRONTEND_URLS`: `https://plataco.netlify.app`

**Stripe no carga el formulario de pago**:
→ Revisa que `STRIPE_PUBLISHABLE_KEY` esté en Railway (empieza con `pk_test_`)

**La base de datos está vacía (no aparecen productos)**:
→ Ejecuta `seed.sql` en la consola de Railway (ver paso 4)

**El pago falla con "pago no completado"**:
→ Verifica que `STRIPE_SECRET_KEY` esté correctamente configurada en Railway

---

## Credenciales de la tienda

- Admin: `admin@plataco.com` / `Admin1234!`
- Cliente test: cualquier email nuevo que registres

---

## Para pasar a producción (cobro real)

Cuando quieras cobrar de verdad:
1. En Stripe activa tu cuenta (verificación de identidad y datos bancarios)
2. Cambia `sk_test_` → `sk_live_` en Railway
3. Cambia `pk_test_` → `pk_live_` en `config.js` y Netlify
4. Crea un nuevo webhook en Stripe apuntando a tu backend con las claves live
5. Actualiza `STRIPE_WEBHOOK_SECRET` en Railway

---

## Costes

- **Netlify**: gratis (ya lo tienes)
- **Railway**: gratis hasta 5$/mes de uso (~500 horas). Para una tienda pequeña es suficiente.
  Cuando crezcas, el plan Hobby cuesta 5$/mes.
- **Stripe**: 0% hasta que cobres. Luego 1.5% + 0.25€ por transacción (tarjetas europeas)
- **Total para empezar**: 0€

---

*Sistema PLATACO — Node.js 18+ · PostgreSQL 16 · Stripe API v3*
