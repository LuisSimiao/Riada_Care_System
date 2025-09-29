const express = require("express");
const router = express.Router();
const db = require("./db"); // adjust path to your db connection
const { decrypt } = require("./encryption");

// Get the most recent non-null readings for each sensor for both Hillcrest-1 and Hillcrest-2
router.get("/api/latest-readings", (req, res) => {
  const device_ids = ["Hillcrest-1", "Hillcrest-2"];
  const queries = device_ids.map(device_id => ({
    device_id,
    temperature: `SELECT temperature_c FROM environment_readings WHERE device_id = ? AND temperature_c IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    humidity: `SELECT humidity_percent FROM environment_readings WHERE device_id = ? AND humidity_percent IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    co: `SELECT co_ppm FROM environment_readings WHERE device_id = ? AND co_ppm IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    co2: `SELECT co2_ppm FROM environment_readings WHERE device_id = ? AND co2_ppm IS NOT NULL ORDER BY timestamp DESC LIMIT 1`
  }));

  const result = {};
  let completed = 0;
  let hasError = false;

  device_ids.forEach((device_id, idx) => {
    result[device_id] = {};
    const q = queries[idx];
    let subCompleted = 0;
    ["temperature", "humidity", "co", "co2"].forEach(key => {
      db.query(q[key], [device_id], (err, rows) => {
        if (hasError) return;
        if (err) {
          hasError = true;
          return res.status(500).json({ error: "Database error." });
        }
        result[device_id][key] = rows.length ? parseFloat(decrypt(Object.values(rows[0])[0])) : null;
        subCompleted++;
        if (subCompleted === 4) {
          completed++;
          if (completed === device_ids.length) {
            res.json(result);
          }
        }
      });
    });
  });
});

module.exports = router;