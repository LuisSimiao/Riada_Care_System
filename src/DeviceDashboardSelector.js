import React, { useState, useEffect } from "react";
import "./DeviceDashboardSelector.css";

// Device groups for selection
const DEVICE_GROUPS = [
  { key: "CARE-A", label: "Hillcrest" },
  { key: "CARE-B", label: "Archview" },
];

// Acceptable environment limits for status lights
const LIMITS = {
  temperature: { min: 18, max: 22 },
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
function DeviceDashboardSelector() {
  // State for available dates, selected group/date, alerts, and readings
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("CARE-A");
  const [selectedDate, setSelectedDate] = useState("");
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    temperature: "grey",
    humidity: "grey",
    co: "grey",
    co2: "grey",
    unreportedAlerts: "grey"
  });
  const [latestReading, setLatestReading] = useState(null);

  // Fetch available dates when group changes
  useEffect(() => {
    fetch(`http://192.168.1.38:3001/api/available-dates?group=${selectedGroup}`)
      .then(res => res.json())
      .then(dates => {
        // Sort dates descending (latest first), ensure only valid date strings
        const validDates = (dates || []).filter(Boolean).sort((a, b) => b.localeCompare(a));
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
    // Get latest environment readings for status lights
    fetch("http://192.168.1.38:3001/api/latest-readings")
      .then(res => res.json())
      .then(data => {
        // Use new backend values directly (already mapped to temperature, humidity, co, co2)
        setLatestReading({
          temperature: data.temperature ?? null,
          humidity: data.humidity ?? null,
          co: data.co ?? null,
          co2: data.co2 ?? null
        });
        setSystemStatus(prev => ({
          ...prev,
          temperature:
            typeof data.temperature === "number" && !isNaN(data.temperature) && data.temperature !== null
              ? (data.temperature < LIMITS.temperature.min || data.temperature > LIMITS.temperature.max ? "red" : "green")
              : "grey",
          humidity:
            typeof data.humidity === "number" && !isNaN(data.humidity) && data.humidity !== null
              ? (data.humidity < LIMITS.humidity.min || data.humidity > LIMITS.humidity.max ? "red" : "green")
              : "grey",
          co:
            typeof data.co === "number" && !isNaN(data.co) && data.co !== null
              ? (data.co > LIMITS.co.max ? "red" : "green")
              : "grey",
          co2:
            typeof data.co2 === "number" && !isNaN(data.co2) && data.co2 !== null
              ? (data.co2 > LIMITS.co2.max ? "red" : "green")
              : "grey"
        }));
      })
      .catch(() => setLatestReading(null));

    // Get unacknowledged alerts for alert status light and alert box
    fetch("http://192.168.1.38:3001/api/unacknowledged-alerts")
      .then(res => res.json())
      .then(data => {
        setSystemStatus(prev => ({
          ...prev,
          unreportedAlerts: (data.alerts && data.alerts.length > 0) ? "red" : "green"
        }));
        setUnacknowledgedAlerts(data.alerts || []);
      });
  }

  // Go to dashboard for selected group and date
  async function handleGo() {
    if (!selectedDate) return;
    // Trigger backend to write JSONL files before navigating
    try {
      await fetch("http://192.168.1.38:3001/api/write-jsonl-for-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, group: selectedGroup })
      });
    } catch (err) {
      // Optionally handle error (could show a message)
      console.error("Failed to write JSONL files:", err);
    }
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
      <div className="lights-row">
        <FourWayStatusLight
          colors={{
            temperature: latestReading && typeof latestReading.temperature === "number" ? getLightColor("temperature", latestReading.temperature) : "grey",
            humidity: latestReading && typeof latestReading.humidity === "number" ? getLightColor("humidity", latestReading.humidity) : "grey",
            co: latestReading && typeof latestReading.co === "number" ? getLightColor("co", latestReading.co) : "grey",
            co2: latestReading && typeof latestReading.co2 === "number" ? getLightColor("co2", latestReading.co2) : "grey",
            unreportedAlerts: systemStatus.unreportedAlerts
          }}
          labels={{}}
        />
        {/* Unacknowledged Alerts status light (for mobile/alt view) */}
        {/* <StatusLight color={systemStatus.unreportedAlerts} label="Unreported Alerts" /> */}
      </div>

      {/* Main dashboard container */}
      <div className="dashboard-container">
        <div className="dashboard-row">
          {/* Left column: dashboard controls */}
          <div className="dashboard-left">
            <h2 className="dashboard-title">Select Dashboard</h2>
            {/* Device group selection buttons */}
            <div className="group-buttons">
              {DEVICE_GROUPS.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setSelectedGroup(group.key)}
                  className={selectedGroup === group.key ? "selected" : ""}
                >
                  {group.label}
                </button>
              ))}
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
    </>
  );
}

export default DeviceDashboardSelector;