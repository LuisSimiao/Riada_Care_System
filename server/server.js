const express = require("express");
const cors = require("cors");

// Routers for API endpoints
const availableDatesRouter = require("./availableDates");
const environmentDataRouter = require("./environmentData");
const saveAccidentReportPdf = require("./saveAccidentReportPdf");
const latestReadingsRouter = require("./latestReadings");
const unacknowledgedAlertsRouter = require("./unacknowledgedAlerts");
const writeJsonlForDateRouter = require("./writeJsonlForDate");
const acknowledgeAlertRouter = require("./acknowledgeAlert");

const app = express();

// Enable CORS for frontend requests
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://192.168.1.22:3000"
  ]
}));
app.use(express.json());

// Register API routers
app.use(availableDatesRouter);
app.use(environmentDataRouter);
app.use(saveAccidentReportPdf);
app.use(latestReadingsRouter);
app.use(unacknowledgedAlertsRouter);
app.use(writeJsonlForDateRouter);
app.use(acknowledgeAlertRouter);

// Livy MQTT listener integration
require("./livyMqttListener");

const PORT = 3001;
app.listen(PORT, '192.168.1.22', () => {
  console.log(`API server running on port ${PORT}`);
});