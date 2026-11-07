const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin: (origin, cb) => (!origin || config.corsOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Origin not allowed')),
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (req, res) => {
  try { await db.query('select 1'); res.json({ ok: true }); } catch (e) { res.status(503).json({ ok: false }); }
});
app.use('/api/auth', require('./routes/auth'));
// Next steps plug in here: /api/products, /api/media, /api/orders, /api/payments, /api/admin

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err && err.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => console.log('KISAKALI API running on port ' + config.port));
