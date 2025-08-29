const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Configure your MySQL connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "hillcrest-database"
});

// Helper: Convert UTC timestamp to GMT+1 (returns MySQL DATETIME string)
function toGmtPlus1(mysqlDatetimeStr) {
  // Accepts "YYYY-MM-DD HH:mm:ss"
  if (!mysqlDatetimeStr) return mysqlDatetimeStr;
  const safeStr = mysqlDatetimeStr.replace(" ", "T");
  const utcDate = new Date(safeStr + "Z");
  if (isNaN(utcDate.getTime())) return mysqlDatetimeStr;
  // Add 1 hour (GMT+1)
  const gmt1Date = new Date(utcDate.getTime() + 60 * 60000);
  // Format as "YYYY-MM-DD HH:mm:ss"
  return gmt1Date.toISOString().replace("T", " ").slice(0, 19);
}

// POST /api/create-alert
router.post("/api/create-alert", (req, res) => {
  let { device_id, timestamp, event_type, severity, acknowledged } = req.body;

  if (!device_id || !timestamp || !event_type) {
    return res.status(400).json({ error: "device_id, timestamp, and event_type are required." });
  }

  // Convert timestamp to GMT+1 before saving
  timestamp = toGmtPlus1(timestamp);

  const sql = `
    INSERT INTO alerts (device_id, timestamp, event_type, severity, acknowledged)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [
      device_id,
      timestamp,
      event_type,
      severity || null,
      acknowledged !== undefined ? acknowledged : false
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting alert:", err);
        return res.status(500).json({ error: "Database error." });
      }
      res.status(201).json({ message: "Alert created.", id: result.insertId });
    }
  );
});

router.get("/api/unacknowledged-alerts", (req, res) => {
  db.query(
    "SELECT device_id, timestamp, event_type, severity FROM alerts WHERE acknowledged = FALSE",
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error." });
      }
      res.json({ alerts: results });
    }
  );
});

router.post("/api/acknowledge-alert", (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) {
    return res.status(400).json({ error: "Both date and time are required." });
  }
  const query = "UPDATE alerts SET acknowledged = 1 WHERE DATE(timestamp) = ? AND TIME(timestamp) LIKE CONCAT(?, '%')";
  db.query(query, [date, time], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error." });
    }
    res.json({ success: true });
  });
});

module.exports = router;