import React, { useState, useEffect } from "react";
import "./DeviceDashboardSelector.css";

// Device groups for selection
const DEVICE_GROUPS = [
  { key: "CARE-A", label: "Hillcrest" }
];

// Acceptable environment limits for status lights
const LIMITS = {
  temperature: { min: 18, max: 24 },
  humidity: { min: 40, max: 60 },
  co: { max: 9 },
  co2: { max: 1000 }
};

/**
 * Four-way segmented status light for environment indicators
 * @param {Object} props
 * @param {Object} props.colors - Colors for each quadrant and center
 * @param {Object} props.labels - Labels for each quadrant
 */
function FourWayStatusLight({ colors, labels }) {
  // Helper to create a quarter-circle SVG path
  function quarterPath(cx, cy, r, startAngle) {
    const rad = (deg) => (Math.PI / 180) * deg;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(startAngle + 90));
    const y2 = cx + r * Math.sin(rad(startAngle + 90));
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
  }
  // Tooltip labels for each quadrant
  const tooltips = {
    temperature: "Temperature",
    humidity: "Humidity",
    co: "CO (Carbon Monoxide)",
    co2: "CO₂ (Carbon Dioxide)",
    unreportedAlerts: "Unreported Alerts"
  };
  return (
    <div className="four-way-status-light">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Quadrant backgrounds with tooltips */}
        <title>Environment Status Lights</title>
        <g>
          <path d={quarterPath(90, 90, 90, 180)} fill={colors.temperature} >
            <title>{tooltips.temperature}</title>
          </path>
          <path d={quarterPath(90, 90, 90, 270)} fill={colors.humidity} >
            <title>{tooltips.humidity}</title>
          </path>
          <path d={quarterPath(90, 90, 90, 0)} fill={colors.co} >
            <title>{tooltips.co}</title>
          </path>
          <path d={quarterPath(90, 90, 90, 90)} fill={colors.co2} >
            <title>{tooltips.co2}</title>
          </path>
        </g>
        {/* Center white circle and alert indicator with tooltip */}
        <circle cx="90" cy="90" r="40" fill="#fff" />
        <circle cx="90" cy="90" r="36.5" fill={colors.unreportedAlerts || '#bdc3c7'}>
          <title>{tooltips.unreportedAlerts}</title>
        </circle>
        {/* Quadrant labels */}
        <text x="50" y="50" textAnchor="middle" fontWeight="bold" fontSize="18" fill="#222">T</text>
        <text x="130" y="50" textAnchor="middle" fontWeight="bold" fontSize="18" fill="#222">H</text>
        <text x="130" y="140" textAnchor="middle" fontWeight="bold" fontSize="18" fill="#222">CO</text>
        <text x="50" y="140" textAnchor="middle" fontWeight="bold" fontSize="18" fill="#222">CO₂</text>
      </svg>
    </div>
  );
}

/**
 * Main dashboard selector component
 */
function DeviceDashboardSelector({ onLogout }) {
  // State for available dates, selected group/date, alerts, and readings
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("CARE-A");
  const [selectedDate, setSelectedDate] = useState("");
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState([]);
  const [deviceAlertStatus, setDeviceAlertStatus] = useState({ "Hillcrest-1": "green", "Hillcrest-2": "green" });
  const [systemStatus, setSystemStatus] = useState({
    temperature: "grey",
    humidity: "grey",
    co: "grey",
    co2: "grey",
    unreportedAlerts: "grey"
  });
  const [latestReading, setLatestReading] = useState(null);
  const [latestReadings, setLatestReadings] = useState({});

  // Fetch available dates when group changes
  useEffect(() => {
    fetch(`http://localhost:3001/api/available-dates?group=${selectedGroup}`)
      .then(res => res.json())
      .then(dates => {
        // Support both array and object with 'dates' property
        const dateArray = Array.isArray(dates) ? dates : (Array.isArray(dates.dates) ? dates.dates : []);
        const validDates = dateArray.filter(Boolean).sort((a, b) => b.localeCompare(a));
        setAvailableDates(validDates);
        setSelectedDate(validDates[0] || "");
      });
  }, [selectedGroup]);

  // Polling interval for real-time updates
  const POLL_INTERVAL = 5000; // 5 seconds

  // Poll for latest readings and alerts
  useEffect(() => {
    fetchStatus(); // Initial fetch
    const interval = setInterval(() => { fetchStatus(); }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  // Fetch latest environment readings and unacknowledged alerts
  function fetchStatus() {
    // Get latest environment readings for both status wheels
    fetch("http://localhost:3001/api/latest-readings")
      .then(res => res.json())
      .then(data => {
        setLatestReadings(data || {});
        // For backward compatibility, also set the first device as latestReading
        setLatestReading(data["Hillcrest-1"] || null);
        setSystemStatus(prev => ({
          ...prev,
          temperature:
            typeof (data["Hillcrest-1"]?.temperature) === "number" && !isNaN(data["Hillcrest-1"].temperature)
              ? (data["Hillcrest-1"].temperature < LIMITS.temperature.min || data["Hillcrest-1"].temperature > LIMITS.temperature.max ? "red" : "green")
              : "grey",
          humidity:
            typeof (data["Hillcrest-1"]?.humidity) === "number" && !isNaN(data["Hillcrest-1"].humidity)
              ? (data["Hillcrest-1"].humidity < LIMITS.humidity.min || data["Hillcrest-1"].humidity > LIMITS.humidity.max ? "red" : "green")
              : "grey",
          co:
            typeof (data["Hillcrest-1"]?.co) === "number" && !isNaN(data["Hillcrest-1"].co)
              ? (data["Hillcrest-1"].co > LIMITS.co.max ? "red" : "green")
              : "grey",
          co2:
            typeof (data["Hillcrest-1"]?.co2) === "number" && !isNaN(data["Hillcrest-1"].co2)
              ? (data["Hillcrest-1"].co2 > LIMITS.co2.max ? "red" : "green")
              : "grey"
        }));
      })
      .catch(() => setLatestReading(null));

    // Get unacknowledged alerts for alert status light and alert box
    fetch("http://localhost:3001/api/unacknowledged-alerts")
      .then(res => res.json())
      .then(data => {
        setUnacknowledgedAlerts(data.alerts || []);
        // Compute alert status per device
        const status = { "Hillcrest-1": "green", "Hillcrest-2": "green" };
        (data.alerts || []).forEach(alert => {
          if (alert.device_id === "Hillcrest-1") status["Hillcrest-1"] = "red";
          if (alert.device_id === "Hillcrest-2") status["Hillcrest-2"] = "red";
        });
        setDeviceAlertStatus(status);
      });
  }

  // Go to dashboard for selected group and date
  async function handleGo() {
    if (!selectedDate) return;
    try {
      await fetch("http://localhost:3001/api/write-jsonl-for-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, group: selectedGroup })
      });
    } catch (err) {
      console.error("Failed to write JSONL files:", err);
    }
    // Instead of opening a new tab, navigate in the same page
    window.location.href = `/dashboard?group=${selectedGroup}&date=${selectedDate}`;
  }

  // Check if a date is available for selection
  function isDateAvailable(dateStr) {
    return availableDates.includes(dateStr);
  }

  // Format MySQL datetime string for display
  function formatAlertDate(mysqlDatetimeStr) {
    if (!mysqlDatetimeStr || typeof mysqlDatetimeStr !== "string") return "";
    let dateObj = new Date(mysqlDatetimeStr);
    if (isNaN(dateObj.getTime())) {
      const safeStr = mysqlDatetimeStr.replace(" ", "T");
      dateObj = new Date(safeStr + "Z");
    }
    if (isNaN(dateObj.getTime())) return mysqlDatetimeStr;
    return dateObj.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  // Get color for status light based on limits
  function getLightColor(type, value) {
    if (type === "temperature")
      return value < LIMITS.temperature.min || value > LIMITS.temperature.max ? "red" : "green";
    if (type === "humidity")
      return value < LIMITS.humidity.min || value > LIMITS.humidity.max ? "red" : "green";
    if (type === "co")
      return value > LIMITS.co.max ? "red" : "green";
    if (type === "co2")
      return value > LIMITS.co2.max ? "red" : "green";
    return "grey";
  }

  // Render dashboard UI
  return (
    <>
      {/* Environment status lights row */}
      <div className="lights-row" style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
        <div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 4 }}>Hillcrest-1</div>
          <FourWayStatusLight
            colors={{
              temperature: latestReadings["Hillcrest-1"] && typeof latestReadings["Hillcrest-1"].temperature === "number" ? getLightColor("temperature", latestReadings["Hillcrest-1"].temperature) : "grey",
              humidity: latestReadings["Hillcrest-1"] && typeof latestReadings["Hillcrest-1"].humidity === "number" ? getLightColor("humidity", latestReadings["Hillcrest-1"].humidity) : "grey",
              co: latestReadings["Hillcrest-1"] && typeof latestReadings["Hillcrest-1"].co === "number" ? getLightColor("co", latestReadings["Hillcrest-1"].co) : "grey",
              co2: latestReadings["Hillcrest-1"] && typeof latestReadings["Hillcrest-1"].co2 === "number" ? getLightColor("co2", latestReadings["Hillcrest-1"].co2) : "grey",
              unreportedAlerts: deviceAlertStatus["Hillcrest-1"]
            }}
            labels={{}}
          />
        </div>
        <div>
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 4 }}>Hillcrest-2</div>
          <FourWayStatusLight
            colors={{
              temperature: latestReadings["Hillcrest-2"] && typeof latestReadings["Hillcrest-2"].temperature === "number" ? getLightColor("temperature", latestReadings["Hillcrest-2"].temperature) : "grey",
              humidity: latestReadings["Hillcrest-2"] && typeof latestReadings["Hillcrest-2"].humidity === "number" ? getLightColor("humidity", latestReadings["Hillcrest-2"].humidity) : "grey",
              co: latestReadings["Hillcrest-2"] && typeof latestReadings["Hillcrest-2"].co === "number" ? getLightColor("co", latestReadings["Hillcrest-2"].co) : "grey",
              co2: latestReadings["Hillcrest-2"] && typeof latestReadings["Hillcrest-2"].co2 === "number" ? getLightColor("co2", latestReadings["Hillcrest-2"].co2) : "grey",
              unreportedAlerts: deviceAlertStatus["Hillcrest-2"]
            }}
            labels={{}}
          />
        </div>
      </div>

      {/* Main dashboard container */}
      <div className="dashboard-container">
        <div className="dashboard-row">
          {/* Left column: dashboard controls */}
          <div className="dashboard-left">
            <h2 className="dashboard-title">Select Dashboard</h2>
            {/* Device group selection buttons */}
            <div className="group-buttons">
              {/* Only Hillcrest button shown */}
              <button
                key="CARE-A"
                className="selected"
                disabled
              >
                Hillcrest
              </button>
            </div>
            {/* Date picker */}
            <div className="date-picker-row">
              <label className="date-label">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isDateAvailable(val)) setSelectedDate(val);
                }}
                min={availableDates.length ? availableDates[availableDates.length - 1] : ""}
                max={availableDates.length ? availableDates[0] : ""}
                className="date-input"
              />
            </div>
            {/* Go to dashboard button */}
            <button
              onClick={handleGo}
              disabled={!selectedDate}
              className="go-dashboard-btn"
            >
              Go to {DEVICE_GROUPS.find((g) => g.key === selectedGroup).label} Dashboard
            </button>
          </div>
          {/* Right column: Fill Out Accident Report button and Unacknowledged Alerts */}
          <div className="dashboard-right">
            {/* Fill Out Accident Report button */}
            <button
              className="accident-report-btn"
              onClick={() => window.open("/accident-report-pdf", "_blank")}
            >
              Fill Out Accident Report
            </button>
            {/* Unacknowledged alerts box */}
            {unacknowledgedAlerts.length > 0 && (
              <div className="unacknowledged-alerts-box">
                <div className="unacknowledged-alerts-title">
                  Unacknowledged Alerts ({unacknowledgedAlerts.length})
                </div>
                {unacknowledgedAlerts.map((alert, idx) => (
                  <div key={idx} className="unacknowledged-alert-item">
                    <div><b>Device:</b> {alert.device_id}</div>
                    <div><b>Time:</b> {formatAlertDate(alert.timestamp)}</div>
                    <div><b>Type:</b> {alert.event_type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Chatbot popup */}
      <ChatBot />
    </>
  );
}

// Simple ChatBot component (uses a backend /api/chat proxy that holds the OpenAI key)
function ChatBot() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const messagesRef = React.useRef(null);

  React.useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, open]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });

      // If the server returned a non-OK status, capture the body for debugging
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      // Ensure we only attempt to parse JSON responses
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Unexpected non-JSON response from server: ' + (text ? text.substring(0,200) : '[empty]'));
      }

      const data = await res.json();
      const reply = data.reply || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No reply';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error: ' + err.message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Launcher button — styled to match app theme via CSS */}
      <div className="chatbot-launcher">
        <button
          onClick={() => setOpen(o => !o)}
          className="chatbot-button"
          title="Chat with assistant"
          aria-expanded={open}
          aria-controls="chatbot-panel"
        >
          💬
        </button>
      </div>

      {/* Popup panel */}
      {open && (
        <div id="chatbot-panel" className="chatbot-panel" role="dialog" aria-label="Assistant chat">
          <div className="chatbot-header">
            <strong>Assistant</strong>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">✖</button>
          </div>

          <div ref={messagesRef} className="chatbot-messages">
            {messages.length === 0 && <div className="chatbot-hint">Ask me about the procedures</div>}
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-message ${m.role}`}>
                <div className="chatbot-bubble">{m.text}</div>
              </div>
            ))}
            {loading && <div className="chatbot-thinking">Thinking...</div>}
          </div>

          <div className="chatbot-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type a message..."
              className="chatbot-input"
              aria-label="Chat input"
            />
            <button onClick={sendMessage} disabled={loading} className="chatbot-send" aria-label="Send message">{loading ? '...' : 'Send'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceDashboardSelector;