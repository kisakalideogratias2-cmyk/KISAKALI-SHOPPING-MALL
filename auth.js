const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

// Verifies the access token AND that the session is still valid and the account is active.
async function requireAuth(req, res, next) {
  try {
    const h = req.get('authorization') || '';
    const token = req.cookies.ksk_at || (h.startsWith('Bearer ') ? h.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'Please log in.' });
    const p = jwt.verify(token, config.jwtSecret);
    const { rows } = await db.query(
      "select u.id, u.role, u.name, u.phone, u.email from users u join refresh_tokens r on r.user_id = u.id where u.id=$1 and r.id=$2 and r.revoked_at is null and r.expires_at > now() and u.status='active'",
      [p.sub, p.sid]);
    if (!rows[0]) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.user = rows[0]; req.sid = p.sid; next();
  } catch (e) { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have access to this.' });
module.exports = { requireAuth, requireRole };
