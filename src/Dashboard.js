import React, { useEffect, useRef, useState } from "react";
import "./Dashboard.css";

const periods = [
  { label: "12am-8am", start: 0, end: 8 },
  { label: "8am-2pm", start: 8, end: 14 },
  { label: "2pm-8pm", start: 14, end: 20 },
  { label: "8pm-12am", start: 20, end: 24 },
];

function getAverages(filtered, property) {
  return periods.map(period => {
    let periodData = filtered.filter(row => {
      const hour = new Date(row.timestamp).getUTCHours();
      return hour >= period.start && hour < period.end;
    });
    // For CO, keep zeros; for others, exclude zeros
    const validData = periodData
      .map(row => Number(row[property]))
      .filter(val => typeof val === 'number' && !isNaN(val) && (property === 'co_ppm' || val !== 0));
    // Debug log for troubleshooting
    console.log(`Averaging for period: ${period.label}, property: ${property}, values:`, validData);
    return validData.length > 0
      ? validData.reduce((sum, val) => sum + val, 0) / validData.length
      : null;
  });
}

function destroyChart(ref) {
  if (ref.current && ref.current._chart) {
    ref.current._chart.destroy();
    ref.current._chart = null;
  }
}

function Dashboard() {
  const tempRef = useRef();
  const humidityRef = useRef();
  const coRef = useRef();
  const co2Ref = useRef();

  const [dashboardDate, setDashboardDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [labels] = useState(periods.map(p => p.label));
  const [alertTables, setAlertTables] = useState([]);

  // Scan available dates from backend API
  useEffect(() => {
    fetch("http://localhost:3001/api/available-dates?group=CARE-A")
      .then(res => res.json())
      .then(dates => {
        // Sort dates descending (latest first), ensure only valid date strings
        const validDates = (dates || []).filter(Boolean).sort((a, b) => b.localeCompare(a));
        setAvailableDates(validDates);
        // Only set dashboardDate if not already set and there are valid dates
        setDashboardDate(prev => prev || (validDates.length ? validDates[0] : ""));
      });
  }, []);

  // Load dashboard for selected date
  useEffect(() => {
    if (!dashboardDate) return;

    // Use group for backend request (assume CARE-A for now, or make this stateful if user can select group)
    const group = "CARE-A"; // TODO: make this dynamic if needed
    fetch("http://localhost:3001/api/write-jsonl-for-date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dashboardDate, group })
    })
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          console.error("Failed to write environment.jsonl:", result.error);
        }
      });

    // Wait a moment for backend to write the file, then fetch it
    setTimeout(() => {
      fetch(process.env.PUBLIC_URL + "/environment.jsonl")
        .then(res => res.text())
        .then(text => {
          const data = text.trim().split('\n').filter(line => line.trim()).map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              console.warn('Skipping malformed line in environment.jsonl:', line);
              return null;
            }
          }).filter(Boolean);
          const [dashboardYear, dashboardMonth, dashboardDay] = dashboardDate.split("-").map(Number);
          const filtered = data.filter(row => {
            if (row.device_id !== "CARE-A-RM1") return false;
            const date = new Date(row.timestamp);
            return (
              date.getUTCFullYear() === dashboardYear &&
              date.getUTCMonth() === dashboardMonth - 1 &&
              date.getUTCDate() === dashboardDay
            );
          });
          // Debug log for filtered data
          console.log('Filtered data for averages:', filtered);

          // Chart data
          const avgTemp = getAverages(filtered, "temperature_c");
          const avgHumidity = getAverages(filtered, "humidity_percent");
          const avgCO = getAverages(filtered, "co_ppm");
          const avgCO2 = getAverages(filtered, "co2_ppm");

          // Destroy previous charts before creating new ones
          destroyChart(tempRef);
          destroyChart(humidityRef);
          destroyChart(coRef);
          destroyChart(co2Ref);

          // Draw charts
          if (window.Chart) {
            tempRef.current._chart = new window.Chart(tempRef.current, {
              type: "line",
              data: {
                labels,
                datasets: [
                  {
                    label: "Average Temperature (°C)",
                    data: avgTemp,
                    borderWidth: 2,
                    fill: false,
                    borderColor: "rgb(0, 110, 0)",
                    backgroundColor: "rgb(0, 110, 0)",
                  },
                ],
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
                datasets: [
                  {
                    label: "Average Humidity (%)",
                    data: avgHumidity,
                    borderWidth: 2,
                    fill: false,
                    borderColor: "rgba(54, 162, 235, 1)",
                    backgroundColor: "rgba(54, 162, 235, 1)",
                  },
                ],
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
                datasets: [
                  {
                    label: "Average CO (ppm)",
                    data: avgCO,
                    borderWidth: 2,
                    fill: false,
                    borderColor: "rgba(255, 206, 86, 1)",
                    backgroundColor: "rgba(255, 206, 86, 1)",
                  },
                ],
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
                datasets: [
                  {
                    label: "Average CO₂ (ppm)",
                    data: avgCO2,
                    borderWidth: 2,
                    fill: false,
                    borderColor: "rgb(100, 100, 100)",
                    backgroundColor: "rgb(100, 100, 100)",
                  },
                ],
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

      // Fetch alerts data
      fetch(process.env.PUBLIC_URL + "/synthetic_alerts.jsonl")
        .then(res => res.text())
        .then(text => {
          const alertData = text.trim().split('\n').filter(line => line.trim()).map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              console.warn('Skipping malformed line in synthetic_alerts.jsonl:', line);
              return null;
            }
          }).filter(Boolean);
          const [dashboardYear, dashboardMonth, dashboardDay] = dashboardDate.split("-").map(Number);
          const allDeviceIds = [...new Set(alertData.map(row => row.device_id))];
          const filteredAlerts = alertData.filter(row => {
            const date = new Date(row.timestamp);
            return (
              date.getUTCFullYear() === dashboardYear &&
              date.getUTCMonth() === dashboardMonth - 1 &&
              date.getUTCDate() === dashboardDay
            );
          });
          const alertTypes = [...new Set(alertData.map(row => row.event_type))];

          // Build tables for each alert type
          const tables = alertTypes.map(alertType => {
            const tableRows = allDeviceIds.map(deviceId => {
              const counts = periods.map(period => {
                let periodAlerts = filteredAlerts.filter(row => {
                  if (row.device_id !== deviceId) return false;
                  if (row.event_type !== alertType) return false;
                  const hour = new Date(row.timestamp).getUTCHours();
                  return hour >= period.start && hour < period.end;
                });
                return periodAlerts.length > 0 ? periodAlerts.length : "-";
              });
              const totalAlerts = filteredAlerts.filter(
                row => row.device_id === deviceId && row.event_type === alertType
              ).length;
              return { deviceId, counts, totalAlerts };
            });
            return { alertType, tableRows };
          });
          setAlertTables(tables);
        });
    }, 300); // 300ms delay to allow backend to write file
  }, [dashboardDate]);

  // Format date for header
  let displayDate = dashboardDate
    ? dashboardDate.split("-").reverse().join("/")
    : "";

  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <span>Dashboard for </span>
        <select
          value={dashboardDate}
          onChange={e => setDashboardDate(e.target.value)}
          style={{
            fontSize: "1em",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #1a5e8a",
            marginLeft: "10px",
            background: "#f4f8fc",
            color: "#1a5e8a",
            fontWeight: "bold",
          }}
        >
          {availableDates.map(date => (
            <option key={date} value={date}>
              {date.split("-").reverse().join("/")}
            </option>
          ))}
        </select>
      </div>
      <div className="charts-row">
        <div className="chart-container">
          <canvas id="myChart" ref={tempRef} height={300} />
        </div>
        <div className="chart-container">
          <canvas id="humidityChart" ref={humidityRef} height={300} />
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-container">
          <canvas id="coChart" ref={coRef} height={300} />
        </div>
        <div className="chart-container">
          <canvas id="co2Chart" ref={co2Ref} height={300} />
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

export default Dashboard;