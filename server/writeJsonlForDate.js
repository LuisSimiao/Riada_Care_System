const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("./db");
const { decrypt } = require("./encryption");

const router = express.Router();

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
    // Environment readings JSONL
    db.query(
      `SELECT * FROM environment_readings WHERE device_id IN (?, ?) AND DATE(timestamp) = ? ORDER BY timestamp ASC`,
      [...deviceIds, date],
      (err, rows) => {
        if (err) {
          console.error('Error in write-jsonl-for-date (env):', err);
          return res.status(500).json({ error: err.message });
        }
        // Only decrypt sensor values, not device_id or timestamp
        const decryptedRows = rows.map(row => ({
          ...row,
          // device_id and timestamp are now plaintext
          temperature_c: parseFloat(decrypt(row.temperature_c)),
          humidity_percent: parseFloat(decrypt(row.humidity_percent)),
          co_ppm: parseFloat(decrypt(row.co_ppm)),
          co2_ppm: parseFloat(decrypt(row.co2_ppm))
        }));
        console.log('Environment readings rows:', decryptedRows.length);
        // Alerts JSONL
        db.query(
          `SELECT * FROM alerts WHERE device_id IN (?, ?) AND DATE(timestamp) = ? ORDER BY timestamp ASC`,
          [...deviceIds, date],
          (err2, alertRows) => {
            if (err2) {
              console.error('Error in write-jsonl-for-date (alerts):', err2);
              return res.status(500).json({ error: err2.message });
            }
            // Only decrypt event_type, not device_id or timestamp
            const decryptedAlertRows = alertRows.map(row => ({
              ...row,
              // device_id and timestamp are now plaintext
              event_type: decrypt(row.event_type),
              acknowledged: row.acknowledged // keep as is if not encrypted
            }));
            console.log('Alerts rows:', decryptedAlertRows.length);
            // Write environment.jsonl
            const envFilePath = path.join(__dirname, "../public/environment.jsonl");
            const envJsonl = decryptedRows.map(row => JSON.stringify(row)).join("\n");
            fs.writeFileSync(envFilePath, envJsonl, "utf8");
            console.log('Wrote environment.jsonl');
            // Write alerts.jsonl
            const alertsFilePath = path.join(__dirname, "../public/alerts.jsonl");
            const alertsJsonl = decryptedAlertRows.map(row => JSON.stringify(row)).join("\n");
            fs.writeFileSync(alertsFilePath, alertsJsonl, "utf8");
            console.log('Wrote alerts.jsonl');
            res.json({ success: true, environmentCount: decryptedRows.length, alertsCount: decryptedAlertRows.length });
          }
        );
      }
    );
  } catch (err) {
    console.error('Error in write-jsonl-for-date:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
