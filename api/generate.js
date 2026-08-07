export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured in Vercel' });
  }

  // রিয়েল-টাইম বাংলাদেশ সময় ও তারিখ বের করার অংশ
  const currentDateTime = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // লাইভ গুগল সার্চ এনাবল
          tools: [{ googleSearch: {} }],
          contents: [
            {
              parts: [
                {
                  text: `Current Local Time & Date in Bangladesh: ${currentDateTime}.\nUser Question: ${prompt}`
                }
              ]
            }
          ]
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API Request Failed' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', details: error.message });
  }
}
