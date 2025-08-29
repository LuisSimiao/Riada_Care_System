const express = require("express");
const cors = require("cors");
const availableDatesRouter = require("./availableDates");
const environmentDataRouter = require("./environmentData");
const writeJsonlRouter = require("./writeJsonl");
const saveAccidentReportPdf = require("./saveAccidentReportPdf");
const createAlertRouter = require("./createAlert");
const latestReadingsRouter = require("./latestReadings");
const unacknowledgedAlertsRouter = require("./unacknowledgedAlerts");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use(availableDatesRouter);
app.use(environmentDataRouter);
app.use(writeJsonlRouter);
app.use(saveAccidentReportPdf);
app.use(createAlertRouter);
app.use(latestReadingsRouter);
app.use(unacknowledgedAlertsRouter);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});