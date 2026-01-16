import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeviceDashboardSelector.css'; // reuse existing styles for buttons and container

// Edit these checks directly in the code to change what the AI validates
const NOTE_CHECKS = [
  { key: 'patient', label: 'Who is the patient (name or ID)' },
  { key: 'wake_time', label: 'What time did the patient wake up' },
  { key: 'ate_breakfast', label: 'Did the patient eat breakfast (yes/no)' },
  { key: 'breakfast_items', label: 'What did the patient eat for breakfast' },
  { key: 'breakfast_location', label: 'Where did the patient eat breakfast' },
  { key: 'finished_all_food', label: 'Did the patient finish all their food (yes/no)' }
];

function NurseNotesPage() {
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheck() {
    setResults(null);
    setError(null);
    if (!note.trim()) return setError('Please enter a nurse note to check.');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/note-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, checks: NOTE_CHECKS })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <h2 className="dashboard-title">Nurse Notes Checker</h2>
        <button onClick={() => navigate(-1)} className="go-dashboard-btn" style={{ maxWidth: 140 }}>← Back</button>
      </div>

      <div style={{ width: '100%', marginTop: 8 }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            width: '100%',
            height: 160,
            maxHeight: 320,
            padding: 12,
            borderRadius: 6,
            border: '2px solid #34495e',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            resize: 'vertical'
          }}
        />

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={handleCheck}
            className="go-dashboard-btn"
            disabled={loading || !note.trim()}
            style={{
              flex: 1,
              height: 44,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              lineHeight: '20px',
              boxSizing: 'border-box'
            }}
          >
            {loading ? 'Checking...' : 'Check note'}
          </button>
          <button
            onClick={() => { setNote(''); setResults(null); setError(null); }}
            className="accident-report-btn"
            style={{
              flex: 1,
              height: 44,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              lineHeight: '20px',
              boxSizing: 'border-box',
              color: '#ffffffff'
            }}
          >
            Clear
          </button>
        </div>

        {error && <div style={{ color: '#c0392b', marginTop: 12 }}>{error}</div>}

        {results && (
          <div style={{ marginTop: 16 }}>
            <h3>AI Results</h3>
            {/* Summary removed per configuration */}
            <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>PASS</strong>
                {Array.isArray(results.passed) && results.passed.length ? (
                  <ul>
                    {results.passed.map((it, i) => (
                      <li key={i}><strong>{it.rule}</strong>: <span style={{ color: 'green' }}>PASS</span> - {it.comment}</li>
                    ))}
                  </ul>
                ) : <div>No passing checks.</div>}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>FAIL</strong>
                {Array.isArray(results.failed) && results.failed.length ? (
                  <ul>
                    {results.failed.map((it, i) => (
                      <li key={i}><strong>{it.rule}</strong>: <span style={{ color: 'red' }}>FAIL</span> - {it.comment}</li>
                    ))}
                  </ul>
                ) : <div>No failed checks.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NurseNotesPage;
