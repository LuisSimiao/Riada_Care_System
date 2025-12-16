const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const contextCache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 120 }); // default 24h

// Hardcoded persona used for all users
const HARDCODED_PERSONA = 'Friendly RN assistant, concise, cites policies. When giving out lists put new items into a new line.';

// POST /api/chat
// Body: { message: string, sessionId?: string }
// This endpoint proxies a chat request to OpenAI using server-side API key stored in process.env.OPENAI_API_KEY
router.post('/api/chat', async (req, res) => {
  const { message, sessionId: providedSessionId } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing or invalid "message" in request body' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key is not configured on the server. Set OPENAI_API_KEY environment variable.' });

  // Model configuration: primary (better) only
  const primaryModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10);
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.2');

  // Helpers to build/cache keys
  function knowledgeKey(docId) { return `knowledge_summary:${docId}`; }
  function convoKey(sessionId) { return `convo:${sessionId}`; }

  // Use provided session id, fallback to authenticated user id, then IP
  const sessionId = providedSessionId || (req.user && req.user.id) || req.ip;
  const userId = (req.user && req.user.id) || null;

  // Use hardcoded persona and load cached knowledge (keep small)
  const persona = HARDCODED_PERSONA;
  const knowledge = contextCache.get(knowledgeKey('falls-sop-v1')) || '';

  // conversation history (keep last 8)
  let convo = contextCache.get(convoKey(sessionId)) || [];
  convo.push({ role: 'user', content: message });
  if (convo.length > 8) convo = convo.slice(-8);
  // Save immediate user message back to cache (so concurrent requests see it)
  contextCache.set(convoKey(sessionId), convo);

  // Build messages for the model
  const system = { role: 'system', content: 'You are a concise assistant that helps users with the Riada Care System dashboard, alerts and devices.' };
  const messages = [
    system,
    ...(persona ? [{ role: 'system', content: `Persona: ${persona}` }] : []),
    ...(knowledge ? [{ role: 'system', content: `Guidance summary:\n${knowledge}` }] : []),
    ...convo
  ];

  // makeRequest now accepts the full messages array
  const makeRequest = async (model, messagesPayload) => {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messagesPayload,
        max_tokens: maxTokens,
        temperature: temperature
      })
    });
  };

  try {
    // Use primary model and return error if the request fails
    const openaiResp = await makeRequest(primaryModel, messages);
    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      console.error('OpenAI API error', primaryModel, openaiResp.status, text);
      return res.status(502).json({ error: 'OpenAI API error', status: openaiResp.status, details: text });
    }

    const data = await openaiResp.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    // Post-process reply: convert Markdown bold to HTML and ensure numbered items are on separate lines
    const originalReply = (reply || '').toString();
    // Insert newline before numbered list items if they were inlined
    let normalized = originalReply.replace(/\s*(\d+)\.\s*/g, '\n$1. ').trim();
    const lines = normalized.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);

    // Convert bold markers and build HTML version
    const convertBold = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let htmlReply;
    if (lines.length > 0 && lines.every(l => /^\d+\.\s+/.test(l))) {
      const items = lines.map(l => convertBold(l.replace(/^\d+\.\s+/, '')));
      htmlReply = '<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
    } else {
      htmlReply = lines.map(l => convertBold(l)).join('<br/>');
    }

    // Append assistant reply to convo and persist cache
    convo.push({ role: 'assistant', content: reply });
    if (convo.length > 8) convo = convo.slice(-8);
    contextCache.set(convoKey(sessionId), convo);

    // Return HTML formatted reply as `reply` so frontends that render HTML see bold and lists.
    // Also return the original text as `textReply` for compatibility.
    return res.json({ reply: htmlReply, textReply: originalReply, choices: data.choices, modelUsed: data.model || primaryModel });
  } catch (err) {
    console.error('Chat proxy failed', err);
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Note: persona is hardcoded via HARDCODED_PERSONA. Remove admin persona endpoint when persona per-user is not required.

// Save knowledge summary example (should be done by an indexing job/UI)
// contextCache.set(knowledgeKey('falls-sop-v1'), 'Summary: immediate assessment, call for help, document time...');

module.exports = router;
