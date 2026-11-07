const config = require('../config');
// Development: prints the message in the terminal. Production: Africa's Talking (set SMS_PROVIDER=africastalking).
async function sendSms(phone, message) {
  if (config.sms.provider === 'africastalking') {
    const host = config.sms.user === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
    const body = new URLSearchParams({ username: config.sms.user, to: phone, message });
    if (config.sms.sender) body.set('from', config.sms.sender);
    const r = await fetch('https://' + host + '/version1/messaging', {
      method: 'POST', headers: { apiKey: config.sms.key, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!r.ok) throw new Error('SMS provider error ' + r.status);
    return;
  }
  console.log('[SMS dev] to ' + phone + ': ' + message);
}
module.exports = { sendSms };
