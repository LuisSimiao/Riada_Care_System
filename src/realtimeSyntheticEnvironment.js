const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { getCARE_A_RM1_ReadingNow } = require("./mockApi_CARE_A_RM1");
const { getCARE_A_RM2_ReadingNow } = require("./mockApi_CARE_A_RM2");
const { getCARE_B_RM1_ReadingNow } = require("./mockApi_CARE_B_RM1");
const { getCARE_B_RM2_ReadingNow } = require("./mockApi_CARE_B_RM2");

const outputPath = path.join(__dirname, "../public/synthetic_environment_test.jsonl");

// MySQL connection config
// MySQL connection config
const connectionConfig = {
  host: "localhost",
  user: "root",
  password: "password",
  database: "hillcrest-database"
};

async function appendCurrentReadings() {
  const readings = [
    getCARE_A_RM1_ReadingNow(),
    getCARE_A_RM2_ReadingNow(),
    getCARE_B_RM1_ReadingNow(),
    getCARE_B_RM2_ReadingNow(),
  ];

  const connection = await mysql.createConnection(connectionConfig);
  const sql = `
    INSERT INTO environment_readings
    (device_id, timestamp, temperature_c, humidity_percent, co_ppm, co2_ppm)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  for (const r of readings) {
    // Convert ISO timestamp to MySQL DATETIME format
    const mysqlTimestamp = r.timestamp.replace("T", " ").replace("Z", "");
    await connection.execute(sql, [
      r.device_id,
      mysqlTimestamp,
      r.temperature_c,
      r.humidity_percent,
      r.co_ppm,
      r.co2_ppm
    ]);
  }

  await connection.end();
  console.log("Appended new readings to MySQL at", getLocalISOString());
}

// Calculate ms until next exact hour
function msUntilNextHour() {
  const now = new Date();
  return (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
}

function getLocalISOString() {
  const now = new Date();
  // Add one hour (in ms)
  const local = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  return local.toISOString();
}

console.log("Real-time synthetic environment simulation started. Waiting for next exact hour...");
console.log(getLocalISOString());

// Wait until the next exact hour, then start hourly interval
setTimeout(() => {
  appendCurrentReadings(); // Run at the exact hour
  console.log("First readings appended at exact hour. Hourly updates will continue.");
  setInterval(appendCurrentReadings, 60 * 60 * 1000); // Run every hour
}, msUntilNextHour());