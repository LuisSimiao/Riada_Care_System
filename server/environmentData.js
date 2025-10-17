const express = require("express");
const db = require("./db");
const { decrypt } = require("./encryption");

const router = express.Router();

router.get("/api/environment-data", async (req, res) => {
  const group = req.query.group || "CARE-A";
  const date = req.query.date; // format: YYYY-MM-DD

  if (!date) return res.status(400).json({ error: "Missing date parameter" });

  // Map group to device IDs (must match frontend logic)
  let deviceIds;
  if (group === "CARE-A") {
    deviceIds = ["Hillcrest-1", "Hillcrest-2"];
  } else {
    deviceIds = ["Hillcrest-1", "Hillcrest-2"];
  }

  db.query(
    `SELECT device_id, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as timestamp, temperature_c, humidity_percent, co_ppm, co2_ppm
     FROM environment_readings
     WHERE device_id IN (?) AND DATE(timestamp) = ?
     ORDER BY timestamp ASC`,
    [deviceIds, date],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      // Only decrypt sensor values, not device_id or timestamp
      const resultRows = rows.map(row => ({
        device_id: row.device_id,
        timestamp: row.timestamp,
        temperature_c: row.temperature_c ? parseFloat(decrypt(row.temperature_c)) : null,
        humidity_percent: row.humidity_percent ? parseFloat(decrypt(row.humidity_percent)) : null,
        co_ppm: row.co_ppm ? parseFloat(decrypt(row.co_ppm)) : null,
        co2_ppm: row.co2_ppm ? parseFloat(decrypt(row.co2_ppm)) : null
      }));
      res.json(resultRows);
    }
  );
});

module.exports = router;