import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { FaInfoCircle } from "react-icons/fa";

function InfoBubble({ text, show }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 38,
        right: 12,
        background: "#f4f8fc",
        color: "#1a5e8a",
        border: "1px solid #1a5e8a",
        borderRadius: "8px",
        padding: "10px 16px",
        fontSize: "0.98em",
        boxShadow: "0 2px 8px #0001",
        zIndex: 10,
        maxWidth: "220px",
        minWidth: "160px",
        textAlign: "left"
      }}
    >
      {text}
    </div>
  );
}

const hillcrestColors = [
  "#a12c2f", // Hillcrest red
  "#e6b13a", // Hillcrest accent
  "#34495e", // Hillcrest dark
  "#27ae60"  // Hillcrest green
];

function DashboardPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const group = query.get("group") || "CARE-A";
  const date = query.get("date") || "";

  const tempRef = useRef();
  const humidityRef = useRef();
  const coRef = useRef();
  const co2Ref = useRef();

  const [labels] = useState(periods.map(p => p.label));
  const [alertTables, setAlertTables] = useState([]);
  const [deviceLabel, setDeviceLabel] = useState(group === "CARE-B" ? "Hillcrest" : "Archview");

  // State for info bubbles
  const [showTempInfo, setShowTempInfo] = useState(false);
  const [showHumidityInfo, setShowHumidityInfo] = useState(false);
  const [showCOInfo, setShowCOInfo] = useState(false);
  const [showCO2Info, setShowCO2Info] = useState(false);

  useEffect(() => {
    if (!date) return;

    // Fetch environment data for the selected date from backend (MySQL)
    fetch(`http://localhost:3001/api/environment-data?group=${group}&date=${date}`, {
      method: "GET"
    })
      .then(res => res.json())
      .then(data => {
        // Write the data to public/synthetic_environment_test.jsonl via backend
        fetch("http://localhost:3001/api/write-jsonl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data })
        })
          .then(res => res.json())
          .then(() => {
            // Now fetch the file for chart rendering
            fetch(process.env.PUBLIC_URL + "/synthetic_environment_test.jsonl")
              .then(res => res.text())
              .then(text => {
                const parsedData = text.trim().split('\n').map(line => JSON.parse(line));
                const [dashboardYear, dashboardMonth, dashboardDay] = date.split("-").map(Number);

                // Get all device IDs for this group and day
                const deviceIds = [...new Set(
                  parsedData
                    .filter(row => row.device_id.startsWith(group))
                    .filter(row => {
                      const d = new Date(row.timestamp);
                      return (
                        d.getUTCFullYear() === dashboardYear &&
                        d.getUTCMonth() === dashboardMonth - 1 &&
                        d.getUTCDate() === dashboardDay
                      );
                    })
                    .map(row => row.device_id)
                )];

                // Prepare chart datasets for each device (room)
                const chartDatasets = deviceIds.map((deviceId, idx) => {
                  const filtered = parsedData.filter(row => {
                    if (row.device_id !== deviceId) return false;
                    const d = new Date(row.timestamp);
                    return (
                      d.getUTCFullYear() === dashboardYear &&
                      d.getUTCMonth() === dashboardMonth - 1 &&
                      d.getUTCDate() === dashboardDay
                    );
                  });
                  return {
                    label: deviceId,
                    data: getAverages(filtered, "temperature_c"),
                    borderWidth: 2,
                    fill: false,
                    borderColor: hillcrestColors[idx % hillcrestColors.length],
                    backgroundColor: hillcrestColors[idx % hillcrestColors.length],
                  };
                });

                // Humidity datasets
                const humidityDatasets = deviceIds.map((deviceId, idx) => {
                  const filtered = parsedData.filter(row => {
                    if (row.device_id !== deviceId) return false;
                    const d = new Date(row.timestamp);
                    return (
                      d.getUTCFullYear() === dashboardYear &&
                      d.getUTCMonth() === dashboardMonth - 1 &&
                      d.getUTCDate() === dashboardDay
                    );
                  });
                  return {
                    label: deviceId,
                    data: getAverages(filtered, "humidity_percent"),
                    borderWidth: 2,
                    fill: false,
                    borderColor: hillcrestColors[idx % hillcrestColors.length],
                    backgroundColor: hillcrestColors[idx % hillcrestColors.length],
                  };
                });

                // CO datasets
                const coDatasets = deviceIds.map((deviceId, idx) => {
                  const filtered = parsedData.filter(row => {
                    if (row.device_id !== deviceId) return false;
                    const d = new Date(row.timestamp);
                    return (
                      d.getUTCFullYear() === dashboardYear &&
                      d.getUTCMonth() === dashboardMonth - 1 &&
                      d.getUTCDate() === dashboardDay
                    );
                  });
                  return {
                    label: deviceId,
                    data: getAverages(filtered, "co_ppm"),
                    borderWidth: 2,
                    fill: false,
                    borderColor: hillcrestColors[idx % hillcrestColors.length],
                    backgroundColor: hillcrestColors[idx % hillcrestColors.length],
                  };
                });

                // CO2 datasets
                const co2Datasets = deviceIds.map((deviceId, idx) => {
                  const filtered = parsedData.filter(row => {
                    if (row.device_id !== deviceId) return false;
                    const d = new Date(row.timestamp);
                    return (
                      d.getUTCFullYear() === dashboardYear &&
                      d.getUTCMonth() === dashboardMonth - 1 &&
                      d.getUTCDate() === dashboardDay
                    );
                  });
                  return {
                    label: deviceId,
                    data: getAverages(filtered, "co2_ppm"),
                    borderWidth: 2,
                    fill: false,
                    borderColor: hillcrestColors[idx % hillcrestColors.length],
                    backgroundColor: hillcrestColors[idx % hillcrestColors.length],
                  };
                });

                // Destroy previous charts before creating new ones
                destroyChart(tempRef);
                destroyChart(humidityRef);
                destroyChart(coRef);
                destroyChart(co2Ref);

                // Draw charts with multiple lines (one per room/device)
                if (window.Chart) {
                  tempRef.current._chart = new window.Chart(tempRef.current, {
                    type: "line",
                    data: {
                      labels,
                      datasets: chartDatasets,
                    },
                    options: {
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "Temperature (°C)" },
                        },
                      },
                      maintainAspectRatio: false,
                    },
                  });

                  humidityRef.current._chart = new window.Chart(humidityRef.current, {
                    type: "line",
                    data: {
                      labels,
                      datasets: humidityDatasets,
                    },
                    options: {
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "Humidity (%)" },
                        },
                      },
                      maintainAspectRatio: false,
                    },
                  });

                  coRef.current._chart = new window.Chart(coRef.current, {
                    type: "line",
                    data: {
                      labels,
                      datasets: coDatasets,
                    },
                    options: {
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "CO (ppm)" },
                        },
                      },
                      maintainAspectRatio: false,
                    },
                  });

                  co2Ref.current._chart = new window.Chart(co2Ref.current, {
                    type: "line",
                    data: {
                      labels,
                      datasets: co2Datasets,
                    },
                    options: {
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: { display: true, text: "CO₂ (ppm)" },
                        },
                      },
                      maintainAspectRatio: false,
                    },
                  });
                }
              });
          });
      });

    // Fetch and process alerts data for tables (unchanged)
    fetch(process.env.PUBLIC_URL + "/synthetic_alerts.jsonl")
      .then(res => res.text())
      .then(text => {
        const alertData = text.trim().split('\n').map(line => JSON.parse(line));
        const [dashboardYear, dashboardMonth, dashboardDay] = date.split("-").map(Number);
        // Get all device IDs for this group
        const allDeviceIds = [...new Set(alertData.map(row => row.device_id))]
          .filter(id => id.startsWith(group));
        // Filter alerts for selected date and group
        const filteredAlerts = alertData.filter(row => {
          if (!row.device_id.startsWith(group)) return false;
          const d = new Date(row.timestamp);
          return (
            d.getUTCFullYear() === dashboardYear &&
            d.getUTCMonth() === dashboardMonth - 1 &&
            d.getUTCDate() === dashboardDay
          );
        });
        // Get all alert types
        const alertTypes = [...new Set(alertData.map(row => row.event_type))];

        // Build tables for each alert type
        const tables = alertTypes.map(alertType => {
          const tableRows = allDeviceIds.map(deviceId => {
            // Count alerts per period for this device and alert type
            const counts = periods.map(period => {
              let periodAlerts = filteredAlerts.filter(row => {
                if (row.device_id !== deviceId) return false;
                if (row.event_type !== alertType) return false;
                const hour = new Date(row.timestamp).getUTCHours();
                return hour >= period.start && hour < period.end;
              });
              return periodAlerts.length > 0 ? periodAlerts.length : "-";
            });
            // Total alerts for this device and alert type
            const totalAlerts = filteredAlerts.filter(
              row => row.device_id === deviceId && row.event_type === alertType
            ).length;
            return { deviceId, counts, totalAlerts };
          });
          return { alertType, tableRows };
        });
        setAlertTables(tables);
      });
  }, [group, date, labels]);

  // Format date for header display (DD/MM/YYYY)
  let displayDate = date ? date.split("-").reverse().join("/") : "";

  return (
    <div className="dashboard-card">
      {/* Back to Main Menu Button */}
      <div style={{ marginBottom: "18px", textAlign: "left" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#1a5e8a",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 20px",
            fontWeight: "bold",
            fontSize: "1em",
            cursor: "pointer",
            boxShadow: "0 2px 8px #0001"
          }}
        >
          ← Back to Main Menu
        </button>
      </div>
      <div className="dashboard-header">
        {deviceLabel} Dashboard for {displayDate}
      </div>
      <div className="charts-row">
        <div className="chart-container" style={{position:"relative"}}>
          <canvas id="myChart" ref={tempRef} height={300} />
          <FaInfoCircle
            title="Shows average temperature (°C) for each room and period."
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#1a5e8a",
              cursor: "pointer",
              zIndex: 11
            }}
            size={22}
            onClick={() => setShowTempInfo(v => !v)}
          />
          <InfoBubble
            text={
              <>
                Shows average temperature (°C) for each room and period.<br />
                <strong>Acceptable range:</strong><br />
                18–22°C.
              </>
            }
            show={showTempInfo}
          />
        </div>
        <div className="chart-container" style={{position:"relative"}}>
          <canvas id="humidityChart" ref={humidityRef} height={300} />
          <FaInfoCircle
            title="Shows average humidity (%) for each room and period."
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#1a5e8a",
              cursor: "pointer",
              zIndex: 11
            }}
            size={22}
            onClick={() => setShowHumidityInfo(v => !v)}
          />
          <InfoBubble
            text={
              <>
                Shows average humidity (%) for each room and period.<br />
                <strong>Acceptable range:</strong><br />
                40–60%.
              </>
            }
            show={showHumidityInfo}
          />
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-container" style={{position:"relative"}}>
          <canvas id="coChart" ref={coRef} height={300} />
          <FaInfoCircle
            title="Shows average carbon monoxide (CO ppm) for each room and period."
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#1a5e8a",
              cursor: "pointer",
              zIndex: 11
            }}
            size={22}
            onClick={() => setShowCOInfo(v => !v)}
          />
          <InfoBubble
            text={
              <>
                Shows average carbon monoxide (CO ppm) for each room and period.<br />
                <strong>Acceptable limit:</strong><br />
                &lt; 9 ppm.
              </>
            }
            show={showCOInfo}
          />
        </div>
        <div className="chart-container" style={{position:"relative"}}>
          <canvas id="co2Chart" ref={co2Ref} height={300} />
          <FaInfoCircle
            title="Shows average carbon dioxide (CO₂ ppm) for each room and period."
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#1a5e8a",
              cursor: "pointer",
              zIndex: 11
            }}
            size={22}
            onClick={() => setShowCO2Info(v => !v)}
          />
          <InfoBubble
            text={
              <>
                Shows average carbon dioxide (CO₂ ppm) for each room and period.<br />
                <strong>Acceptable limit:</strong><br />
                &lt; 1000 ppm.
              </>
            }
            show={showCO2Info}
          />
        </div>
      </div>
      <div className="alerts-table-container">
        <h2 style={{textAlign:"center", color:"#1a5e8a", marginBottom:"18px"}}>Alert Counts by Device and Period</h2>
        <div className="alerts-tables-row">
          {alertTables.map(({ alertType, tableRows }) => (
            <div className="alert-table-block" key={alertType}>
              <h3 className="alert-table-title">
                {alertType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Alerts
              </h3>
              <table className="alert-table">
                <thead>
                  <tr>
                    <th>Device ID</th>
                    {labels.map(label => (
                      <th key={label}>{label}</th>
                    ))}
                    <th>Total Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <tr key={row.deviceId}>
                      <td>{row.deviceId}</td>
                      {row.counts.map((count, idx) =>
                        typeof count === "number" && count > 0 ? (
                          <td key={idx}>
                            <span className="circle-number">{count}</span>
                          </td>
                        ) : (
                          <td key={idx}>{count}</td>
                        )
                      )}
                      {typeof row.totalAlerts === "number" && row.totalAlerts > 0 ? (
                        <td>
                          <span className="circle-number total">{row.totalAlerts}</span>
                        </td>
                      ) : (
                        <td>{row.totalAlerts}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper to get query parameters from URL
function useQuery() {
  return new URLSearchParams(window.location.search);
}

// Define periods for your dashboard
const periods = [
  { label: "12am-8am", start: 0, end: 8 },
  { label: "8am-2pm", start: 8, end: 14 },
  { label: "2pm-8pm", start: 14, end: 20 },
  { label: "8pm-12am", start: 20, end: 24 },
];

// Helper to calculate averages for chart data
function getAverages(filtered, property) {
  return periods.map(period => {
    let periodData = filtered.filter(row => {
      const hour = new Date(row.timestamp).getUTCHours();
      return hour >= period.start && hour < period.end;
    });
    return periodData.length > 0
      ? periodData.reduce((sum, row) => sum + row[property], 0) / periodData.length
      : null;
  });
}

// Helper to destroy previous Chart.js charts
function destroyChart(ref) {
  if (ref.current && ref.current._chart) {
    ref.current._chart.destroy();
    ref.current._chart = null;
  }
}

export default DashboardPage;