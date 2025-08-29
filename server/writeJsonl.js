const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.post("/api/write-jsonl", (req, res) => {
  let data = req.body.data;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Data must be an array" });
  }

  const filePath = path.join(__dirname, "../public/synthetic_environment_test.jsonl");
  // Write the timestamp as received from MySQL
  const jsonl = data.map(row => JSON.stringify(row)).join("\n");

  fs.writeFile(filePath, jsonl, "utf8", err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;