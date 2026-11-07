const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { sendSms } = require('./sms');

const hash = (code) => crypto.createHmac('sha256', config.otpPepper).update(code).digest('hex');
const sameHash = (a, b) => { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function tooMany(phone) {
  const { rows } = await db.query("select count(*)::int n from otp_challenges where phone=$1 and created_at > now() - interval '10 minutes'", [phone]);
  return rows[0].n >= config.otp.maxPerPhone10min;
}

// userId null creates a decoy (same response shape for unknown phones, nothing is sent).
async function createChallenge({ userId, phone, purpose }) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const { rows } = await db.query(
    "insert into otp_challenges(user_id, phone, purpose, code_hash, expires_at) values($1,$2,$3,$4, now() + ($5 || ' seconds')::interval) returning id",
    [userId, phone, purpose, hash(code), String(config.otp.ttlSec)]);
  if (userId) await sendSms(phone, 'KISAKALI: your code is ' + code + '. It expires in 5 minutes. Never share it with anyone.');
  return { id: rows[0].id, code };
}

// Returns the challenge row on success, otherwise null. Each code works once; wrong guesses are counted.
async function verifyChallenge({ id, code, purpose }) {
  const { rows } = await db.query(
    'update otp_challenges set attempts = attempts + 1 where id=$1 and purpose=$2 and consumed_at is null and expires_at > now() and attempts < $3 returning *',
    [id, purpose, config.otp.maxAttempts]);
  const c = rows[0];
  if (!c || !c.user_id || !sameHash(hash(String(code)), c.code_hash)) return null;
  const used = await db.query('update otp_challenges set consumed_at = now() where id=$1 and consumed_at is null returning id', [id]);
  return used.rowCount ? c : null;
}
module.exports = { createChallenge, verifyChallenge, tooMany };
