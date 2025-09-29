const express = require("express");
const mysql = require("mysql2/promise");
const { decrypt } = require("./encryption");

const router = express.Router();

const connectionConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "hillcrest-database"
};

router.get("/api/environment-data", async (req, res) => {
  const group = req.query.group || "CARE-A";
  const date = req.query.date; // format: YYYY-MM-DD

  if (!date) return res.status(400).json({ error: "Missing date parameter" });

  // Map group to device IDs (must match frontend logic)
  let deviceIds;
  if (group === "CARE-A") {
    deviceIds = ["Hillcrest-1", "Hillcrest-2"];
  } else {
    deviceIds = ["Archview-1", "Archview-2"];
  }

  try {
    const connection = await mysql.createConnection(connectionConfig);
    // Use device_id IN (?, ?) for the two device IDs
    const [rows] = await connection.execute(
      `SELECT device_id, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as timestamp, temperature_c, humidity_percent, co_ppm, co2_ppm
       FROM environment_readings
       WHERE device_id IN (?, ?)
         AND DATE(timestamp) = ?
       ORDER BY timestamp ASC`,
      [...deviceIds, date]
    );
    await connection.end();
    // Decrypt all fields in each row
    const decryptedRows = rows.map(row => ({
      device_id: decrypt(row.device_id),
      timestamp: decrypt(row.timestamp),
      temperature_c: parseFloat(decrypt(row.temperature_c)),
      humidity_percent: parseFloat(decrypt(row.humidity_percent)),
      co_ppm: parseFloat(decrypt(row.co_ppm)),
      co2_ppm: parseFloat(decrypt(row.co2_ppm))
    }));
    res.json(decryptedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;