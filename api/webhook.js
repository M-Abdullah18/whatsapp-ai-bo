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

      for (const entry of req.body.entry ?? []) {
        for (const changes of entry.changes ?? []) {
          const value = changes?.value;

          for (const message of value?.messages ?? []) {
            try {
              if (message && message.type === 'text') {
                const from = message.from; 
                const userMessage = message.text.body;

                console.log(`Received message from ${from}: ${userMessage}`);

                // --- 🤖 Gemini AI Response Logic ---
                let botReply = '';
                const geminiApiKey = process.env.GEMINI_API_KEY;

                if (!geminiApiKey) {
                  console.error("GEMINI_API_KEY environment variable missing!");
                  botReply = "api not working";
                } else {
                  try {
                    const aiResponse = await fetch(
                      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          contents: [{
                            parts: [{ text: userMessage }]
                          }]
                        })
                      }
                    );

                    const aiData = await aiResponse.json();

                    if (aiResponse.ok && aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
                      botReply = aiData.candidates[0].content.parts[0].text;
                    } else {
                      console.error("Gemini API Error Response:", JSON.stringify(aiData));
                      botReply = "api not working";
                    }
                  } catch (aiErr) {
                    console.error("Gemini Fetch Execution Error:", aiErr);
                    botReply = "api not working";
                  }
                }

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

                if (!waResponse.ok) {
                  console.error(`WhatsApp API Send FAILED (HTTP ${waResponse.status}) for ${from}:`, JSON.stringify(waData?.error ?? waData));
                }
              }
            } catch (msgError) {
              console.error(`Error handling message ${message?.id}:`, msgError);
            }
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error("Webhook Execution Error:", error);
      return res.status(200).send('EVENT_RECEIVED');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
