require('dotenv').config();
const need = (k) => { if (!process.env[k]) throw new Error('Missing environment variable: ' + k); return process.env[k]; };
const prod = process.env.NODE_ENV === 'production';
const jwtSecret = need('JWT_SECRET');
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
module.exports = {
  prod,
  port: Number(process.env.PORT || 4000),
  databaseUrl: need('DATABASE_URL'),
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret,
  otpPepper: need('OTP_PEPPER'),
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  cookie: { secure: prod, sameSite: process.env.COOKIE_SAMESITE || 'lax', domain: process.env.COOKIE_DOMAIN || undefined },
  accessTtlSec: 15 * 60,
  refreshTtlDays: 30,
  otp: { ttlSec: 300, maxAttempts: 5, maxPerPhone10min: 5, devShow: !prod && process.env.DEV_SHOW_OTP === 'true' },
  lock: { maxFails: 5, minutes: 15 },
  allowSignup: process.env.ALLOW_CUSTOMER_SIGNUP !== 'false',
  sms: { provider: process.env.SMS_PROVIDER || 'console', user: process.env.AT_USERNAME, key: process.env.AT_API_KEY, sender: process.env.AT_SENDER_ID },
};
