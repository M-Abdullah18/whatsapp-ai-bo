export default async function handler(req, res) {
  // 1. Meta Webhook Verification (GET Request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'mybotsecret123';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // 2. Incoming Messages Handling (POST Request)
  if (req.method === 'POST') {
    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from; // Sender WhatsApp Number
        const userMessage = message.text.body;

        // Gemini AI Response
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }]
          })
        });

        const geminiData = await geminiRes.json();
        const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf kijiye, samajh nahi aaya.";

        // Send Reply via Meta WhatsApp Cloud API
        await fetch(`https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: botReply }
          })
        });
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
