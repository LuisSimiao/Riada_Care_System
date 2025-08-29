const express = require("express");
const mysql = require("mysql2/promise");

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

  let devicePrefix = group === "CARE-A" ? "CARE-A" : "CARE-B";

  try {
    const connection = await mysql.createConnection(connectionConfig);
    const [rows] = await connection.execute(
      `SELECT device_id, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as timestamp, temperature_c, humidity_percent, co_ppm, co2_ppm
       FROM environment_readings
       WHERE device_id LIKE ?
         AND DATE(timestamp) = ?
       ORDER BY timestamp ASC`,
      [`${devicePrefix}%`, date]
    );
    await connection.end();
    res.json(rows); // No conversion!
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;