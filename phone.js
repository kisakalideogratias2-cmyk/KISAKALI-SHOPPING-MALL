// Accepts 0712345678, 255712345678 or +255712345678. Returns +255XXXXXXXXX or null.
function normalizePhone(input) {
  let s = String(input || '').replace(/[\s\-()]/g, '');
  if (/^0\d{9}$/.test(s)) s = '+255' + s.slice(1);
  else if (/^255\d{9}$/.test(s)) s = '+' + s;
  return /^\+255[67]\d{8}$/.test(s) ? s : null;
}
const hint = (p) => p.slice(0, 5) + '****' + p.slice(-3);
module.exports = { normalizePhone, hint };
