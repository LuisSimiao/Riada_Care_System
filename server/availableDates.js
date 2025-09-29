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

router.get("/api/available-dates", async (req, res) => {
  const group = req.query.group; // "CARE-A" or "CARE-B"
  let devicePrefix = group === "CARE-A" ? "Hillcrest-1" : "Archview-1";

  try {
    const connection = await mysql.createConnection(connectionConfig);
    const [rows] = await connection.execute(
      `SELECT DISTINCT timestamp FROM environment_readings WHERE device_id = ? ORDER BY timestamp DESC`,
      [decrypt(devicePrefix)]
    );
    await connection.end();

    // Decrypt timestamps and extract unique dates
    const datesSet = new Set();
    rows.forEach(row => {
      const ts = decrypt(row.timestamp);
      if (ts) {
        const date = ts.slice(0, 10); // YYYY-MM-DD
        datesSet.add(date);
      }
    });
    const dates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;