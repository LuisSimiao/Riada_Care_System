const express = require("express");
const router = express.Router();
const db = require("./db"); // adjust path to your db connection

// Get all unacknowledged alerts
router.get("/api/unacknowledged-alerts", (req, res) => {
  const query = `
    SELECT * FROM alerts
    WHERE acknowledged = 0
    ORDER BY timestamp DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    res.json({ alerts: results });
  });
});

module.exports = router;