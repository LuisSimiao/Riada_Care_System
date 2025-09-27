const express = require("express");
const router = express.Router();
const db = require("./db"); // adjust path to your db connection

// Get the most recent non-null readings for each sensor for a device
router.get("/api/latest-readings", (req, res) => {
  const device_id = "Hillcrest-1"; // TODO: make dynamic if needed
  const queries = {
    temperature: `SELECT temperature_c FROM environment_readings WHERE device_id = ? AND temperature_c IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    humidity: `SELECT humidity_percent FROM environment_readings WHERE device_id = ? AND humidity_percent IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    co: `SELECT co_ppm FROM environment_readings WHERE device_id = ? AND co_ppm IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
    co2: `SELECT co2_ppm FROM environment_readings WHERE device_id = ? AND co2_ppm IS NOT NULL ORDER BY timestamp DESC LIMIT 1`
  };

  const result = {};
  let completed = 0;
  let hasError = false;

  Object.entries(queries).forEach(([key, sql]) => {
    db.query(sql, [device_id], (err, rows) => {
      if (hasError) return;
      if (err) {
        hasError = true;
        return res.status(500).json({ error: "Database error." });
      }
      result[key] = rows.length ? Object.values(rows[0])[0] : null;
      completed++;
      if (completed === 4) {
        res.json(result);
      }
    });
  });
});

module.exports = router;