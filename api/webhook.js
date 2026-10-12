export default async function handler(req, res) {
  // 1. Meta Webhook Verification (GET Request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'mybotsecret123';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log("Webhook Verified Successfully!");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // 2. Incoming Messages Handling (POST Request)
  if (req.method === 'POST') {
    try {
      console.log("Incoming Webhook Body:", JSON.stringify(req.body, null, 2));

      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (!message) {
        return res.status(200).send('EVENT_RECEIVED');
      }

      if (message && message.type === 'text') {
        const from = message.from; 
        const userMessage = message.text.body;

        console.log(`Received message from ${from}: ${userMessage}`);

        // Bot Intro & Autonomous Test Response
        let botReply = `Salam! Main aapka autonomous WhatsApp test bot hoon. Aapka message mil gaya hai: "${userMessage}". System bilkul fit kaam kar raha hai! 🚀`;

        // --- Send Reply via Meta WhatsApp Cloud API ---
        const phoneId = process.env.PHONE_NUMBER_ID || '1446876238489546';
        
        const waResponse = await fetch(
          `https://graph.facebook.com/v26.0/${phoneId}/messages`,
          {
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
          }
        );

        const waData = await waResponse.json();
        console.log("WhatsApp API Send Response:", JSON.stringify(waData, null, 2));
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error("Webhook Execution Error:", error);
      return res.status(200).send('EVENT_RECEIVED');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
