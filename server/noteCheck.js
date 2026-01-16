const express = require('express');
const router = express.Router();

// Use global fetch (Node 18+) when available, otherwise fall back to node-fetch if installed
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch.bind(globalThis);
} else {
  try {
    const nf = require('node-fetch');
    fetch = nf.default || nf;
  } catch (err) {
    console.error('node-fetch is not installed and global fetch is unavailable. Install node-fetch (`npm install node-fetch`) or run on Node 18+ to provide global fetch.');
    throw err;
  }
}

router.post('/api/note-check', async (req, res) => {
  const { note, checks } = req.body || {};
  if (!note || !Array.isArray(checks)) return res.status(400).json({ error: 'note and checks array required' });

  try {
    const prompt = `You are a clinical notes reviewer. Examine the following nurse note and evaluate it against these checks: ${checks.map(c => c.label).join('; ')}.\n\nImportant: When determining patient identity, look for what sounds like a person's name followed immediately by an action (for example: "Brock woke up", "alice had breakfast", "Name: Sam"). Treat a name-like token (capitalized or lowercase) that is immediately followed by an action verb such as "woke up", "woke", "awoke", "had", "ate", "went", "arrived" as the patient's name and mark the Patient identification check as passed if such a pattern is present.\n\nNote:\n${note}\n\nRespond with a JSON object exactly with keys: summary (one-sentence), score (0-100), issues (array of {rule, passed:boolean, comment:string}). Do not include any extra commentary or additional fields.`;

    const chatRes = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });

    if (!chatRes.ok) {
      const txt = await chatRes.text();
      return res.status(502).json({ error: 'Chat proxy failed', details: txt });
    }

    const chatData = await chatRes.json();
    let parsed;
    const rawReply = (chatData.textReply || chatData.reply || '');
    let cleaned = String(rawReply).replace(/<br\s*\/?>(\s*)/gi, '\n').replace(/<[^>]*>/g, '\n').trim();
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonText = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(jsonText);
      } catch (err) {
        return res.status(502).json({ error: 'AI returned non-JSON or malformed JSON', aiText: cleaned });
      }
    } else {
      return res.status(502).json({ error: 'AI returned non-JSON', aiText: cleaned });
    }

    // Heuristic fallback: if AI failed to detect patient identity, try simple regex on the original note
    try {
      if (parsed && Array.isArray(parsed.issues)) {
        const patientIssue = parsed.issues.find(i => /(patient|Patient|Patient identification)/i.test(i.rule || ''));
        if (patientIssue && !patientIssue.passed) {
          // Look for patterns like 'Brock woke up', 'brock woke up', 'Name: Brock', or start of note being a name
          const namePatterns = [
            /\b([A-Z][a-z]+)\b(?=\s+(?:woke up|woke|awoke|had|ate))/i,
            /\b([a-z]{2,})\b(?=\s+(?:woke up|woke|awoke|had|ate))/i,
            /^\s*([A-Za-z]{2,})\b/i,
            /name[:\s]+([A-Za-z]{2,})/i
          ];
          let found = null;
          for (const rx of namePatterns) {
            const m = rx.exec(note || '');
            if (m && m[1]) { found = m[1]; break; }
          }
          if (found) {
            patientIssue.passed = true;
            patientIssue.comment = (patientIssue.comment || '') + ` Detected name in note: ${found}`;
          }
        }
      }
    } catch (e) {
      // noop - heuristics must not break the main flow
      console.error('Patient heuristic failed:', e && e.message);
    }

    // Transform issues into passed / failed arrays and return only those sections
    try {
      const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const passed = issues.filter(i => i.passed).map(i => ({ rule: i.rule || i.ruleName || '', comment: i.comment || '' }));
      const failed = issues.filter(i => !i.passed).map(i => ({ rule: i.rule || i.ruleName || '', comment: i.comment || '' }));
      const response = {
        passed,
        failed
      };
      return res.json(response);
    } catch (e) {
      console.error('Failed to transform issues:', e && e.message);
      return res.status(500).json({ error: 'Failed to process AI results' });
    }
  } catch (err) {
    console.error('note-check error', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
