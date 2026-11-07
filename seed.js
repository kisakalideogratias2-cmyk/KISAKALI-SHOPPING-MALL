require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const cats = [['Cakes & Pastries', 'cakes'], ['Flower Bouquets', 'flowers'], ['Surprise Boxes & Hampers', 'surprises'], ['ZENVO Fashion', 'fashion'], ['Electronics & Beauty', 'electronics']];
const accounts = [
  { name: 'Super Admin', phone: '+255634172673', email: 'Kisakali69@gmail.com', role: 'admin' },
  { name: 'Kilombero Cake Artisans', phone: '+255700000001', role: 'vendor', shop: 'Kilombero Cake Artisans' },
  { name: 'Rider Hamisi', phone: '+255700000002', role: 'driver' },
  { name: 'Asha', phone: '+255700000000', role: 'customer' },
];
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env first');
  const pass = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(pass, 12);
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await c.connect();
  try {
    for (const [name, slug] of cats) await c.query('insert into categories(name, slug) values($1,$2) on conflict (slug) do nothing', [name, slug]);
    await c.query("insert into app_settings(key, value) values ('commission_percent','10'), ('media_limits', $1) on conflict (key) do nothing",
      [JSON.stringify({ imageMB: 5, videoMB: 50, maxImages: 10, maxVideos: 3, quotaMB: 200, imageTypes: ['image/jpeg', 'image/png', 'image/webp'], videoTypes: ['video/mp4', 'video/webm', 'video/quicktime'] })]);
    for (const a of accounts) {
      const r = await c.query('insert into users(name, email, phone, password_hash, role) values($1,$2,$3,$4,$5) on conflict (phone) do nothing returning id', [a.name, a.email || null, a.phone, hash, a.role]);
      if (!r.rows[0]) { console.log('exists:', a.role, a.phone); continue; }
      const id = r.rows[0].id;
      if (a.role === 'vendor') await c.query("insert into vendors(user_id, shop_name, approval_status) values($1,$2,'approved')", [id, a.shop]);
      if (a.role === 'driver') await c.query("insert into drivers(user_id, verification_status) values($1,'verified')", [id]);
      console.log('created:', a.role.padEnd(8), a.phone);
    }
    console.log('\nPassword for NEW seed accounts: ' + pass + '\nChange these passwords before going live.');
  } finally { await c.end(); }
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
