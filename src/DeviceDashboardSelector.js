import React, { useState, useEffect } from "react";

const DEVICE_GROUPS = [
  { key: "CARE-A", label: "Hillcrest" },
  { key: "CARE-B", label: "Archview" },
];

function DeviceDashboardSelector() {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("CARE-A");
  const [selectedDate, setSelectedDate] = useState("");

  // Scan available dates for the selected group
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/synthetic_environment.jsonl")
      .then(res => res.text())
      .then(text => {
        const data = text.trim().split('\n').map(line => JSON.parse(line));
        // Filter by device group prefix
        const filtered = data.filter(row => row.device_id.startsWith(selectedGroup));
        const dates = [
          ...new Set(
            filtered.map(row =>
              new Date(row.timestamp).toISOString().slice(0, 10)
            )
          ),
        ].sort();
        setAvailableDates(dates);
        setSelectedDate(dates[0] || "");
      });
  }, [selectedGroup]);

  // Redirect to dashboard for selected group and date
  function handleGo() {
    if (!selectedDate) return;
    // You can change this to your dashboard route or file pattern
    window.location.href = `/dashboard?group=${selectedGroup}&date=${selectedDate}`;
  }

  return (
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 2px 16px #0002",
      maxWidth: "400px",
      margin: "60px auto",
      padding: "32px 28px",
      textAlign: "center"
    }}>
      <h2 style={{color:"#1a5e8a", marginBottom:"24px"}}>Select Dashboard</h2>
      <div style={{marginBottom:"18px"}}>
        {DEVICE_GROUPS.map(group => (
          <button
            key={group.key}
            onClick={() => setSelectedGroup(group.key)}
            style={{
              background: selectedGroup === group.key ? "#1a5e8a" : "#e3f0ff",
              color: selectedGroup === group.key ? "#fff" : "#1a5e8a",
              border: "none",
              borderRadius: "6px",
              padding: "10px 22px",
              marginRight: "12px",
              fontWeight: "bold",
              fontSize: "1em",
              cursor: "pointer"
            }}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div style={{marginBottom:"24px"}}>
        <label style={{marginRight:"10px", fontWeight:"500"}}>Date:</label>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{
            fontSize: "1em",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #1a5e8a",
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
      <button
        onClick={handleGo}
        disabled={!selectedDate}
        style={{
          background: "#1a5e8a",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "10px 32px",
          fontWeight: "bold",
          fontSize: "1.1em",
          cursor: "pointer"
        }}
      >
        Go to {DEVICE_GROUPS.find(g => g.key === selectedGroup).label} Dashboard
      </button>
    </div>
  );
}

export default DeviceDashboardSelector;