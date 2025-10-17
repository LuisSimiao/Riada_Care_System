// livyMqttListener.js
// Handles Livy MQTT integration for fall and temperature alerts

const mqtt = require("mqtt");
const db = require("./db"); // Database connection
const { decrypt, encrypt } = require("./encryption");

// MQTT connection options for secure (TLS) connection
const options = {
  host: "mqtt.livy.systems",
  port: 8883,
  protocol: "mqtts",
  username: "HyYmGe1dIRc6",
  password: "jC7T6pYYdk6FtYaI9K1BEnNfhxOrYeWdpUlAZUJUoGS08t1sAbALr3a3eaMthzLx",
  clientId: "LUQ3x9nhLiKU",
  rejectUnauthorized: false // Only use this for testing/self-signed certs
};

const deviceID = "901ba6defd0eaf9582842d145a9cfaec973232d6a358ea0c82900bd6fa1bd616";
const deviceID2 = "a23642c514657abb08966a6d1227360e69e9e6c196724280257effc11602f6de";
const device_id = "Hillcrest-1";
const device_id2 = "Hillcrest-2";
const topics = [
  // Hillcrest-1 topics
  `alive/${deviceID}/sensors/TEMPERATURE`,
  `alive/${deviceID}/sensors/HUMIDITY`,
  `alive/${deviceID}/sensors/CO`,
  `alive/${deviceID}/sensors/CO2`,
  `alive/${deviceID}/alarm/fall`,
  `alive/${deviceID}/alarm/oob`,
  `alive/${deviceID}/alarm/oor`,
  `alive/${deviceID}/alarm/help_call`,
  // Hillcrest-2 topics
  `alive/${deviceID2}/sensors/TEMPERATURE`,
  `alive/${deviceID2}/sensors/HUMIDITY`,
  `alive/${deviceID2}/sensors/CO`,
  `alive/${deviceID2}/sensors/CO2`,
  `alive/${deviceID2}/alarm/fall`,
  `alive/${deviceID2}/alarm/oob`,
  `alive/${deviceID2}/alarm/oor`,
  `alive/${deviceID2}/alarm/help_call`
];

let client = null;
let isConnected = false;

function connectAndSubscribe() {
  if (client) {
    try { client.end(true); } catch (e) {}
  }
  client = mqtt.connect(options);

  client.on("connect", () => {
    isConnected = true;
    console.log("Connected to Livy MQTT broker");
    topics.forEach(topic => {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error("Subscription error:", err);
        } else {
          console.log("Subscribed to topic:", topic);
        }
      });
    });
  });

  client.on("message", (topic, message) => {
    console.log(`Received message on ${topic}: ${message.toString()}`);
    // Handle alarm topics
    if (topic.endsWith("/alarm/fall") || topic.endsWith("/alarm/oob") || topic.endsWith("/alarm/oor") || topic.endsWith("/alarm/help_call")) {
      let eventType = null;
      let acknowledged = 0;
      if (topic.endsWith("/alarm/fall")) {
        eventType = "fall";
        acknowledged = 0;
      } else if (topic.endsWith("/alarm/oob")) {
        eventType = "oob";
        acknowledged = 1;
      } else if (topic.endsWith("/alarm/oor")) {
        eventType = "oor";
        acknowledged = 1;
      } else if (topic.endsWith("/alarm/help_call")) {
        eventType = "help_call";
        acknowledged = 1;
      }
      try {
        console.log("[ALERT] Raw payload:", message.toString());
        const payload = JSON.parse(message.toString());
        console.log("[ALERT] Parsed payload:", payload);
        // Extract device_id from topic: alive/<deviceID>/alarm/<event>
        const topicParts = topic.split('/');
        let topicDeviceId = null;
        if (topicParts.length >= 4) {
          // Map deviceID to friendly device_id if needed
          if (topicParts[1] === deviceID) {
            topicDeviceId = device_id; // Hillcrest-1
          } else if (topicParts[1] === deviceID2) {
            topicDeviceId = device_id2; // Hillcrest-2
          } else {
            topicDeviceId = topicParts[1]; // Otherwise use raw deviceID
          }
        } else {
          topicDeviceId = device_id; // fallback
        }
        // Use payload.timestamp if present, else current time
        let timestamp = payload.timestamp;
        if (timestamp) {
          const date = new Date(timestamp);
          date.setHours(date.getHours() + 1); // Always add 1 hour for alerts
          timestamp = date.toISOString().slice(0, 19).replace('T', ' ');
        } else {
          const now = new Date();
          now.setSeconds(0, 0);
          now.setHours(now.getHours() + 1); // Always add 1 hour for alerts
          timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
        }
        db.query(
          `INSERT INTO alerts (device_id, timestamp, event_type, acknowledged) VALUES (?, ?, ?, ?)`,
          [topicDeviceId, timestamp, encrypt(eventType), acknowledged],
          (err, result) => {
            if (err) {
              console.error(`[ALERT] Failed to insert alert (${eventType}):`, err, { topicDeviceId, timestamp, eventType });
            } else {
              console.log(`[ALERT] Alert inserted:`, { topicDeviceId, eventType, timestamp, acknowledged, result });
            }
          }
        );
      } catch (e) {
        console.error(`[ALERT] Error parsing MQTT alarm message:`, e, { topic, message: message.toString() });
      }
      return;
    }
    let column = null;
    if (topic.endsWith("/TEMPERATURE")) column = "temperature_c";
    else if (topic.endsWith("/HUMIDITY")) column = "humidity_percent";
    else if (topic.endsWith("/CO")) column = "co_ppm";
    else if (topic.endsWith("/CO2")) column = "co2_ppm";
    if (!column) return;
    // Extract device_id from topic: alive/<deviceID>/sensors/<sensor>
    const topicParts = topic.split('/');
    let topicDeviceId = null;
    if (topicParts.length >= 4) {
      if (topicParts[1] === deviceID) {
        topicDeviceId = device_id; // Hillcrest-1
      } else if (topicParts[1] === deviceID2) {
        topicDeviceId = device_id2; // Hillcrest-2
      } else {
        topicDeviceId = topicParts[1]; // Otherwise use raw deviceID
      }
    } else {
      topicDeviceId = device_id; // fallback
    }
    try {
      const payload = JSON.parse(message.toString());
      let value = (payload[column] !== undefined && payload[column] !== null)
        ? payload[column]
        : (payload.value !== undefined && payload.value !== null)
          ? payload.value
          : null;
      // Use UTC+1 (local time) for timestamp (rounded to the current minute)
      let timestamp = payload.timestamp;
      if (timestamp) {
        // Parse as UTC, add 1 hour for local time
        const date = new Date(timestamp);
        date.setHours(date.getHours() + 1);
        timestamp = date.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        const now = new Date();
        now.setSeconds(0, 0);
        timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
      }
      // If value is null, fetch the most recent non-null value for this column
      if (value === null) {
        db.query(
          `SELECT ${column} FROM environment_readings WHERE device_id = ? AND ${column} IS NOT NULL ORDER BY timestamp DESC LIMIT 1`,
          [topicDeviceId],
          (err, results) => {
            if (err) {
              console.error(`Failed to fetch previous ${column} value:`, err);
              return;
            }
            if (results && results.length > 0) {
              value = results[0][column];
            }
            upsertReading();
          }
        );
      } else {
        upsertReading();
      }
      function upsertReading() {
        if (value !== null) {
          db.query(
            `INSERT INTO environment_readings (device_id, timestamp, ${column}) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
            [topicDeviceId, timestamp, encrypt(value)],
            (err) => {
              if (err) console.error(`Failed to upsert ${column} reading:`, err);
              else console.log(`${column} reading upserted:`, { topicDeviceId, value, timestamp });
            }
          );
        } else {
          console.warn(`${column} value missing in payload and no previous value found:`, payload);
        }
      }
    } catch (e) {
      console.error(`Error parsing MQTT ${column} message:`, e);
    }
  });

  client.on("error", (err) => {
    isConnected = false;
    console.error("MQTT error:", err);
  });
}

// Calculate ms until next hour
function msUntilNextHour() {
  const now = new Date();
  return (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
}

function scheduleHourlyReconnect() {
  setTimeout(() => {
    connectAndSubscribe();
    setInterval(connectAndSubscribe, 60 * 60 * 1000); // Every hour
  }, msUntilNextHour());
}

connectAndSubscribe();
scheduleHourlyReconnect();

module.exports = client;
