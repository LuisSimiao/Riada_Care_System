const express = require("express");
const router = express.Router();
const db = require("./db"); // adjust path to your db connection
const { decrypt } = require("./encryption");

// Get all unacknowledged alerts
router.get("/api/unacknowledged-alerts", (req, res) => {
  const query = `
    SELECT * FROM alerts
    WHERE acknowledged = 0
    ORDER BY timestamp DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    // Decrypt all fields for each alert
    const decryptedAlerts = results.map((row) => ({
      ...row,
      device_id: decrypt(row.device_id),
      timestamp: decrypt(row.timestamp),
      event_type: decrypt(row.event_type),
      acknowledged: row.acknowledged, // keep as is if not encrypted
    }));
    res.json({ alerts: decryptedAlerts });
  });
});

module.exports = router;