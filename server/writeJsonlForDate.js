const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const router = express.Router();

const connectionConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "hillcrest-database"
};

// POST /api/write-jsonl-for-date
// Body: { date: "YYYY-MM-DD", group: "CARE-A" or "CARE-B" }
router.post("/api/write-jsonl-for-date", async (req, res) => {
  const { date, group } = req.body;
  if (!date || !group) {
    return res.status(400).json({ error: "date and group are required" });
  }
  let deviceIds = [];
  if (group === "CARE-A") {
    deviceIds = ["Hillcrest-1", "Hillcrest-2"];
  } else if (group === "CARE-B") {
    deviceIds = ["Archview-1", "Archview-2"];
  } else {
    return res.status(400).json({ error: "Invalid group" });
  }
  try {
    const connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to DB, group:', group, 'deviceIds:', deviceIds, 'date:', date);
    // Environment readings JSONL
    const [rows] = await connection.execute(
      `SELECT * FROM environment_readings WHERE device_id IN (?, ?) AND DATE(timestamp) = ? ORDER BY timestamp ASC`,
      [...deviceIds, date]
    );
    console.log('Environment readings rows:', rows.length);
    // Alerts JSONL
    const [alertRows] = await connection.execute(
      `SELECT * FROM alerts WHERE device_id IN (?, ?) AND DATE(timestamp) = ? ORDER BY timestamp ASC`,
      [...deviceIds, date]
    );
    console.log('Alerts rows:', alertRows.length);
    await connection.end();
    // Write environment.jsonl
    const envFilePath = path.join(__dirname, "../public/environment.jsonl");
    const envJsonl = rows.map(row => JSON.stringify(row)).join("\n");
    fs.writeFileSync(envFilePath, envJsonl, "utf8");
    console.log('Wrote environment.jsonl');
    // Write alerts.jsonl
    const alertsFilePath = path.join(__dirname, "../public/alerts.jsonl");
    const alertsJsonl = alertRows.map(row => JSON.stringify(row)).join("\n");
    fs.writeFileSync(alertsFilePath, alertsJsonl, "utf8");
    console.log('Wrote alerts.jsonl');
    res.json({ success: true, environmentCount: rows.length, alertsCount: alertRows.length });
  } catch (err) {
    console.error('Error in write-jsonl-for-date:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
