const express = require("express");
const mysql = require("mysql2/promise");

const router = express.Router();

const connectionConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "hillcrest-database"
};

router.get("/api/available-dates", async (req, res) => {
  const group = req.query.group; // "CARE-A" or "CARE-B"
  let devicePrefix = group === "CARE-A" ? "CARE-A" : "CARE-B";

  try {
    const connection = await mysql.createConnection(connectionConfig);
    const [rows] = await connection.execute(
      `SELECT DISTINCT DATE_FORMAT(timestamp, '%Y-%m-%d') as date
       FROM environment_readings
       WHERE device_id LIKE ?
       ORDER BY date DESC`,
      [`${devicePrefix}%`]
    );
    await connection.end();

    // Dates are now strings in YYYY-MM-DD format, no timezone conversion
    const dates = rows.map(row => row.date);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;