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

    if (!chatId || !latitude || !longitude) {
      console.error('Missing required parameters');
      return res.status(400).json({ ok: false, error: 'Missing required parameters.' });
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendLocation`;
      const data = {
        chat_id: chatId,
        latitude: latitude,
        longitude: longitude
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data)
      });

      const result = await response.json();

      if (!result.ok) {
        console.error('Telegram API error:', result);
        return res.status(500).json({ ok: false, error: result.description });
      }

      console.log('Location sent successfully:', result);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error in sendMedia:', error);
      return res.status(500).json({ ok: false, error: 'Failed to send location: ' + error.message });
    }
  });
};
