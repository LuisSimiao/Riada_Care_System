const express = require("express");
const db = require("./db");

const router = express.Router();

router.get("/api/available-dates", (req, res) => {
  const group = req.query.group; // "CARE-A" or "CARE-B"
  let deviceIds = group === "CARE-A"
    ? ["Hillcrest-1", "Hillcrest-2"]
    : ["Hillcrest-1", "Hillcrest-2"];

  db.query(
    `SELECT DISTINCT timestamp FROM environment_readings WHERE device_id IN (${deviceIds.map(() => '?').join(',')}) ORDER BY timestamp DESC`,
    deviceIds,
    (err, rows) => {
      if (err) {
        console.error('[available-dates] Error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log('[available-dates] Query returned rows:', rows); // Debug log
      // Extract unique dates from plaintext timestamps
      const datesSet = new Set();
      rows.forEach(row => {
        if (row.timestamp) {
          const d = new Date(row.timestamp);
          const date = d.toISOString().slice(0, 10); // YYYY-MM-DD
          datesSet.add(date);
        }
      });
      const dates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
      res.json(dates);
    }
  );
});

module.exports = router;