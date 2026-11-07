const { Pool } = require('pg');
const config = require('./config');
const pool = new Pool({ connectionString: config.databaseUrl, ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined, max: 10 });
pool.on('error', (e) => console.error('Database pool error:', e.message));
module.exports = { query: (text, params) => pool.query(text, params), pool };
