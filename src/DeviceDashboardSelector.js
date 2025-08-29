import React, { useState, useEffect } from "react";
import "./DeviceDashboardSelector.css";

// Hillcrest House Nursing Home colour scheme
const HILLCREST_COLORS = {
  primary: "#a12c2f",      // deep red from logo
  accent: "#e6b13a"        // gold/yellow from logo
};

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

// Status light component for environment indicators
function StatusLight({ color, label }) {
  return (
    <div className="status-light">
      <span className={`status-light-circle ${color}`}></span>
      <span className="status-light-label" style={{
        color: color === "red" ? "#c0392b" : "#222"
      }}>
        {label}
      </span>
    </div>
  );
}

function DeviceDashboardSelector() {
  // State for available dates, selected group/date, alerts, and readings
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("CARE-A");
  const [selectedDate, setSelectedDate] = useState("");
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState([]);
  const [alertStatus, setAlertStatus] = useState("");
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
    fetch(`http://localhost:3001/api/available-dates?group=${selectedGroup}`)
      .then(res => res.json())
      .then(dates => {
        setAvailableDates(dates);
        setSelectedDate(dates[0] || "");
      });
  }, [selectedGroup]);

  // Polling interval for real-time updates
  const POLL_INTERVAL = 5000; // 5 seconds

  // Poll for latest readings and alerts
  useEffect(() => {
    fetchStatus(); // Initial fetch

    const interval = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL);

    // Cleanup polling on unmount or group change
    return () => clearInterval(interval);
  }, [selectedGroup]);

  // Fetch latest environment readings and unacknowledged alerts
  function fetchStatus() {
    // Get latest environment readings for status lights
    fetch("http://localhost:3001/api/latest-readings")
      .then(res => res.json())
      .then(data => {
        setLatestReading(data);
        setSystemStatus(prev => ({
          ...prev,
          temperature:
            data.temperature < LIMITS.temperature.min || data.temperature > LIMITS.temperature.max
              ? "red"
              : "green",
          humidity:
            data.humidity < LIMITS.humidity.min || data.humidity > LIMITS.humidity.max
              ? "red"
              : "green",
          co: data.co > LIMITS.co.max ? "red" : "green",
          co2: data.co2 > LIMITS.co2.max ? "red" : "green"
        }));
      })
      .catch(() => setLatestReading(null));

    // Get unacknowledged alerts for alert status light and alert box
    fetch("http://localhost:3001/api/unacknowledged-alerts")
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
  function handleGo() {
    if (!selectedDate) return;
    window.location.href = `/dashboard?group=${selectedGroup}&date=${selectedDate}`;
  }

  // Check if a date is available for selection
  function isDateAvailable(dateStr) {
    return availableDates.includes(dateStr);
  }

  // Create a manual alert for testing
  async function handleCreateAlert() {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace("T", " ");
    const alertData = {
      device_id: "CARE-A-RM1",
      timestamp,
      event_type: "Manual Alert",
      severity: "Medium",
      acknowledged: false
    };
    const res = await fetch("http://localhost:3001/api/create-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData)
    });
    if (res.ok) {
      setAlertStatus("Alert created successfully.");
      // Refresh alerts after creation
      fetch("http://localhost:3001/api/unacknowledged-alerts")
        .then(res => res.json())
        .then(data => setUnacknowledgedAlerts(data.alerts || []));
    } else {
      setAlertStatus("Failed to create alert.");
    }
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
        <StatusLight
          color={latestReading && typeof latestReading.temperature === "number" ? getLightColor("temperature", latestReading.temperature) : "grey"}
          label={`Temperature${latestReading && typeof latestReading.temperature === "number" ? `: ${latestReading.temperature}°C` : ""}`}
        />
        <StatusLight
          color={latestReading && typeof latestReading.humidity === "number" ? getLightColor("humidity", latestReading.humidity) : "grey"}
          label={`Humidity${latestReading && typeof latestReading.humidity === "number" ? `: ${latestReading.humidity}%` : ""}`}
        />
        <StatusLight
          color={latestReading && typeof latestReading.co === "number" ? getLightColor("co", latestReading.co) : "grey"}
          label={`CO${latestReading && typeof latestReading.co === "number" ? `: ${latestReading.co} ppm` : ""}`}
        />
        <StatusLight
          color={latestReading && typeof latestReading.co2 === "number" ? getLightColor("co2", latestReading.co2) : "grey"}
          label={`CO₂${latestReading && typeof latestReading.co2 === "number" ? `: ${latestReading.co2} ppm` : ""}`}
        />
        <StatusLight color={systemStatus.unreportedAlerts} label="Unreported Alerts" />
      </div>

      {/* Main dashboard container */}
      <div className="dashboard-container">
        <div className="dashboard-row" style={{ alignItems: "flex-start" }}>
          {/* Left column: dashboard controls */}
          <div className="dashboard-left" style={{ marginBottom: 0 }}>
            <h2
              style={{
                color: HILLCREST_COLORS.primary,
                marginBottom: "18px",
                fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif",
                fontSize: "1.5em",
                letterSpacing: "1px",
                textAlign: "left"
              }}
            >
              Select Dashboard
            </h2>
            {/* Device group selection buttons */}
            <div style={{ marginBottom: "12px", textAlign: "left" }}>
              {DEVICE_GROUPS.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setSelectedGroup(group.key)}
                  style={{
                    background:
                      selectedGroup === group.key
                        ? HILLCREST_COLORS.primary
                        : HILLCREST_COLORS.buttonAccentBg,
                    color:
                      selectedGroup === group.key
                        ? HILLCREST_COLORS.buttonText
                        : HILLCREST_COLORS.buttonAccentText,
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 18px",
                    marginRight: "8px",
                    fontWeight: "bold",
                    fontSize: "1em",
                    cursor: "pointer",
                    boxShadow:
                      selectedGroup === group.key
                        ? "0 2px 8px #a12c2f44"
                        : "none",
                    fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>
            {/* Date picker */}
            <div style={{ marginBottom: "16px", textAlign: "left" }}>
              <label
                style={{
                  marginRight: "8px",
                  fontWeight: "bold",
                  color: HILLCREST_COLORS.text,
                  fontSize: "1em",
                  fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
                }}
              >
                Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onClick={(e) =>
                  e.target.showPicker && e.target.showPicker()
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (isDateAvailable(val)) setSelectedDate(val);
                }}
                min={
                  availableDates.length
                    ? availableDates[availableDates.length - 1]
                    : ""
                }
                max={availableDates.length ? availableDates[0] : ""}
                style={{
                  fontSize: "1em",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `2px solid ${HILLCREST_COLORS.primary}`,
                  background: "#fff",
                  color: HILLCREST_COLORS.text,
                  fontWeight: "bold",
                  fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
                }}
              />
            </div>
            {/* Go to dashboard button */}
            <button
              onClick={handleGo}
              disabled={!selectedDate}
              style={{
                background: HILLCREST_COLORS.primary,
                color: HILLCREST_COLORS.buttonText,
                border: "none",
                borderRadius: "6px",
                padding: "12px 24px",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                boxShadow: "0 2px 8px #a12c2f22",
                marginBottom: "10px",
                width: "100%",
                maxWidth: "220px",
                fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
              }}
            >
              Go to {DEVICE_GROUPS.find((g) => g.key === selectedGroup).label} Dashboard
            </button>
            {/* Create alert button */}
            <button
              style={{
                background: "#c0392b",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 18px",
                fontWeight: "bold",
                fontSize: "1em",
                cursor: "pointer",
                marginTop: "12px",
                width: "100%",
                maxWidth: "220px",
                fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
              }}
              onClick={handleCreateAlert}
            >
              Create Alert (Test)
            </button>
            {/* Alert creation status message */}
            {alertStatus && (
              <div style={{
                color: "#e74c3c",
                marginTop: "10px",
                textAlign: "left",
                fontSize: "1em",
                fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
              }}>
                {alertStatus}
              </div>
            )}
          </div>
          {/* Right column: Fill Out Accident Report button and Unacknowledged Alerts */}
          <div className="dashboard-right" style={{ marginTop: 0 }}>
            {/* Fill Out Accident Report button */}
            <button
              style={{
                background: HILLCREST_COLORS.accent,
                color: HILLCREST_COLORS.buttonAccentText,
                border: "none",
                borderRadius: "6px",
                padding: "10px 18px",
                fontWeight: "bold",
                fontSize: "1em",
                cursor: "pointer",
                marginBottom: "18px",
                boxShadow: "0 2px 8px #e6b13a44",
                width: "100%",
                maxWidth: "220px",
                fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
              }}
              onClick={() => window.open("/accident-report-pdf", "_blank")}
            >
              Fill Out Accident Report
            </button>
            {/* Unacknowledged alerts box */}
            {unacknowledgedAlerts.length > 0 && (
              <div
                style={{
                  marginTop: "0",
                  background: "#fffbe6",
                  border: `1px solid ${HILLCREST_COLORS.accent}`,
                  borderRadius: "8px",
                  boxShadow: "0 1px 6px #e6b13a22",
                  padding: "12px 14px",
                  textAlign: "left",
                  maxWidth: "260px",
                  marginLeft: "auto",
                  marginRight: "auto",
                  fontSize: "1em",
                  fontFamily: "'Arial Rounded MT Bold', Arial, 'Helvetica Neue', Helvetica, sans-serif"
                }}
              >
                <div
                  style={{
                    color: HILLCREST_COLORS.accent,
                    fontWeight: "bold",
                    marginBottom: "10px",
                    fontSize: "1em"
                  }}
                >
                  Unacknowledged Alerts ({unacknowledgedAlerts.length})
                </div>
                {unacknowledgedAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: "10px",
                      paddingBottom: "8px",
                      borderBottom:
                        idx !== unacknowledgedAlerts.length - 1
                          ? "2px solid #e67e22"
                          : "none",
                      fontSize: "0.95em"
                    }}
                  >
                    <div style={{ color: HILLCREST_COLORS.text, marginBottom: "2px" }}>
                      <b>Device:</b> {alert.device_id}
                    </div>
                    <div style={{ color: HILLCREST_COLORS.text, marginBottom: "2px" }}>
                      <b>Time:</b> {formatAlertDate(alert.timestamp)}
                    </div>
                    <div style={{ color: HILLCREST_COLORS.text, marginBottom: "2px" }}>
                      <b>Type:</b> {alert.event_type}
                    </div>
                    <div style={{ color: HILLCREST_COLORS.text }}>
                      <b>Severity:</b> {alert.severity}
                    </div>
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