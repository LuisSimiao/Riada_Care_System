const express = require("express");
const router = express.Router();
const db = require("./db"); // adjust path to your db connection

// Get the most recent readings across all devices
router.get("/api/latest-readings", (req, res) => {
  const query = `
    SELECT temperature_c, humidity_percent, co_ppm, co2_ppm
    FROM environment_readings
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error." });
    }
    if (!results.length) {
      console.warn("No readings found in environment_readings table.");
      return res.json({});
    }
    // Rename keys to match frontend expectations
    const row = results[0];
    res.json({
      temperature: row.temperature_c,
      humidity: row.humidity_percent,
      co: row.co_ppm,
      co2: row.co2_ppm,
      timestamp: row.timestamp
    });
  });
});

module.exports = router;