const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const base = () => ({ httpOnly: true, secure: config.cookie.secure, sameSite: config.cookie.sameSite, domain: config.cookie.domain });

async function issueSession(req, res, user) {
  const rt = crypto.randomBytes(48).toString('base64url');
  const { rows } = await db.query(
    "insert into refresh_tokens(user_id, token_hash, user_agent, ip, expires_at) values($1,$2,$3,$4, now() + ($5 || ' days')::interval) returning id",
    [user.id, sha(rt), String(req.get('user-agent') || '').slice(0, 250), req.ip, String(config.refreshTtlDays)]);
  const sid = rows[0].id;
  const at = jwt.sign({ sub: String(user.id), role: user.role, sid }, config.jwtSecret, { expiresIn: config.accessTtlSec });
  res.cookie('ksk_at', at, { ...base(), path: '/', maxAge: config.accessTtlSec * 1000 });
  res.cookie('ksk_rt', rt, { ...base(), path: '/api/auth', maxAge: config.refreshTtlDays * 864e5 });
  return sid;
}
const clearCookies = (res) => { res.clearCookie('ksk_at', { ...base(), path: '/' }); res.clearCookie('ksk_rt', { ...base(), path: '/api/auth' }); };
module.exports = { issueSession, clearCookies, sha };
