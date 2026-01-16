const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Use global fetch (Node 18+) when available, otherwise fall back to node-fetch if installed
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch.bind(globalThis);
} else {
  try {
    const nf = require('node-fetch');
    fetch = nf.default || nf;
  } catch (err) {
    console.error('node-fetch is not installed and global fetch is unavailable. Install node-fetch (`npm install node-fetch`) or run on Node 18+ to provide global fetch.');
    throw err;
  }
}

// Routers for API endpoints
const availableDatesRouter = require("./availableDates");
const environmentDataRouter = require("./environmentData");
const saveAccidentReportPdf = require("./saveAccidentReportPdf");
const latestReadingsRouter = require("./latestReadings");
const unacknowledgedAlertsRouter = require("./unacknowledgedAlerts");
const writeJsonlForDateRouter = require("./writeJsonlForDate");
const acknowledgeAlertRouter = require("./acknowledgeAlert");
const chatRouter = require("./chat");

const app = express();

// Enable CORS for frontend requests
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3000"
  ]
}));
app.use(express.json());
app.use(bodyParser.json());

// Register API routers
app.use(availableDatesRouter);
app.use(environmentDataRouter);
app.use(saveAccidentReportPdf);
app.use(latestReadingsRouter);
app.use(unacknowledgedAlertsRouter);
app.use(writeJsonlForDateRouter);
app.use(acknowledgeAlertRouter);
app.use(chatRouter);

// Mount note-check router
const noteCheckRouter = require('./noteCheck');
app.use(noteCheckRouter);

// Livy MQTT listener integration
require("./livyMqttListener");

const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});