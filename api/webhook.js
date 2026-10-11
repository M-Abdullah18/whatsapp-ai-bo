export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userMessage = req.body.message || req.body.text || "Hello";
    const apiKey = process.env.GEMINI_API_KEY;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }]
      })
    });

    const data = await geminiRes.json();
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf kijiye, samajh nahi aaya.";

    return res.status(200).json({ reply: botReply });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
