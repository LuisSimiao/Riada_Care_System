const express = require("express");
const db = require("./db");
const { decrypt, encrypt } = require("./encryption");
const router = express.Router();

// POST /api/acknowledge-alert
router.post("/api/acknowledge-alert", async (req, res) => {
  const { date, time, location } = req.body;
  if (!date || !time || !location) {
    return res.status(400).json({ error: "Missing date, time, or location" });
  }

  // Map location to device IDs
  let deviceIds = [];
  if (location === "Hillcrest") {
    deviceIds = ["Hillcrest-1", "Hillcrest-2"];
  } else if (location === "Archview") {
    deviceIds = ["Archview-1", "Archview-2"];
  } else {
    return res.status(400).json({ error: "Invalid location" });
  }

  // Encrypt device IDs for matching
  const encryptedDeviceIds = deviceIds.map((id) => encrypt(id));

  // Extract hour and minute from time string
  const [hour, minute] = time.split(":").map(Number);

  try {
    const placeholders = encryptedDeviceIds.map(() => "?").join(",");
    const sql = `
      UPDATE alerts
      SET acknowledged = 1
      WHERE device_id IN (${placeholders})
        AND DATE(timestamp) = ?
        AND HOUR(timestamp) = ?
        AND MINUTE(timestamp) = ?
        AND acknowledged = 0
    `;
    // Encrypt date for matching
    const encryptedDate = encrypt(date);
    // Note: timestamp is likely stored as encrypted string, so matching by date/hour/minute may require decrypting in SQL or storing a plaintext copy for search. If not possible, this may need a different approach.
    const params = [...encryptedDeviceIds, date, hour, minute];
    const result = await db.query(sql, params);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error("Error acknowledging alert:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
