# KISAKALI SHOPPING MALL: Backend (Step 1-2: Database + Authentication)

Node.js 18+ and PostgreSQL 13+.

## Run it (first time)
1. Create the database (on the server or your computer):
   `createdb kisakali` (or create it in pgAdmin / your hosting panel).
2. `cp .env.example .env`, then fill in `DATABASE_URL`, `JWT_SECRET`, `OTP_PEPPER`.
   Make each secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. `npm install`
4. `npm run migrate`   (creates all tables; safe to repeat)
5. `npm run seed`      (categories, settings, 4 demo accounts; prints a password once)
6. `npm start`         (API on http://localhost:4000, check /api/health)

Seed accounts: admin +255634172673, vendor +255700000001, rider +255700000002, customer +255700000000.
Change these passwords before going live.

## Login flow (matches your portals: password, then OTP)
| Step | Call | Body |
|---|---|---|
| 1 | `POST /api/auth/login` | `{identifier, password, portal}` where portal is customer, vendor, driver or admin |
| 2 | `POST /api/auth/verify-otp` | `{challengeId, code}` sets secure cookies |
Also: `/register` (customers only), `/refresh`, `/logout`, `/logout-all`, `/sessions`, `/me`, `/change-password`, `/forgot`, `/reset`.
In development, `DEV_SHOW_OTP=true` returns `devCode` in step 1 so you can test without SMS.

## Connect a portal (replaces the demo CFG gate)
```js
const API = "http://localhost:4000";
async function api(path, body) {
  const r = await fetch(API + path, { method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
}
// step 1
const s1 = await api("/api/auth/login", { identifier: "0700000000", password: "...", portal: "customer" });
// step 2
await api("/api/auth/verify-otp", { challengeId: s1.challengeId, code: "123456" });
```
Add your website address to `CORS_ORIGINS` in `.env`. Use HTTPS in production.

## Security built in
bcrypt passwords (cost 12), account lock after 5 wrong passwords, OTP hashed, single-use, 5 tries, 5 minutes, rate limits, httpOnly cookies, refresh-token rotation with theft detection, sessions that can be revoked, role checks (`requireRole`), audit log, no account guessing on forgot-password.

## Next steps
Products and media upload, orders with vendor sub-orders, mobile-money payments, rider flow, admin tools.
