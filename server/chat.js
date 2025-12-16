const express = require('express');
const router = express.Router();

// POST /api/chat
// Body: { message: string }
// This endpoint proxies a chat request to OpenAI using server-side API key stored in process.env.OPENAI_API_KEY
router.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing or invalid "message" in request body' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key is not configured on the server. Set OPENAI_API_KEY environment variable.' });

  // Model configuration: primary (better) only
  const primaryModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.2');

  const makeRequest = async (model) => {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a concise assistant that helps users with the Riada Care System dashboard, alerts and devices.' },
          { role: 'user', content: message }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      })
    });
  };

  try {
    // Use primary model and return error if the request fails
    const openaiResp = await makeRequest(primaryModel);
    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      console.error('OpenAI API error', primaryModel, openaiResp.status, text);
      return res.status(502).json({ error: 'OpenAI API error', status: openaiResp.status, details: text });
    }

    const data = await openaiResp.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return res.json({ reply, choices: data.choices, modelUsed: data.model || primaryModel });
  } catch (err) {
    console.error('Chat proxy failed', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

module.exports = router;
