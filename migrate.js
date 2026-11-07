require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env first');
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await c.connect();
  try {
    await c.query('begin');
    await c.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    await c.query('commit');
    console.log('Database schema is up to date.');
  } catch (e) { await c.query('rollback'); throw e; } finally { await c.end(); }
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
