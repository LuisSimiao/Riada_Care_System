const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();

router.post(
  "/api/save-accident-report-pdf",
  express.raw({ type: "application/pdf", limit: "10mb" }),
  (req, res) => {
    try {
      const pdfBuffer = req.body;
      const location = req.query.location === "Hillcrest" ? "Hillcrest" : "Archview";

      // Get date and time from query params (sent from frontend)
      const dateFromForm = req.query.date || ""; // expected format: YYYY-MM-DD
      const timeFromForm = req.query.time || ""; // expected format: HH:MM
      const dateStr = dateFromForm || now.toISOString().slice(0,10);
      const timeStr = timeFromForm ? timeFromForm.replace(/:/g, "-") : now.toTimeString().slice(0,8).replace(/:/g, "-");
      const filename = `Accident_Report_${location}_${dateStr}_${timeStr}.pdf`;

      const saveDir = path.join(__dirname, `../public/Accident Reports/${location}`);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      const savePath = path.join(saveDir, filename);

      fs.writeFile(savePath, pdfBuffer, err => {
        if (err) {
          console.error("Error saving PDF:", err);
          return res.status(500).send("Failed to save PDF");
        }
        res.status(200).send("PDF saved successfully");
      });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;