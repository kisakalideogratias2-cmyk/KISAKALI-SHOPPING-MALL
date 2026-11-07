const db = require('../db');
module.exports = function audit(req, action, userId, role, meta) {
  return db.query('insert into audit_logs(user_id, role, action, ip, meta) values($1,$2,$3,$4,$5)',
    [userId || null, role || null, action, req.ip, meta ? JSON.stringify(meta) : null]).catch((e) => console.error('audit failed:', e.message));
};
