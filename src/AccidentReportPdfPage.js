import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import "./AccidentReportPdfPage.css";

// Main component for the Accident/Incident Report PDF form
function AccidentReportPdfPage({ onLogout }) {
  // State for all form fields
  const [form, setForm] = useState({
    text_1zzfy: "",      // Name
    text_2ovd: "",       // Date of accident
    text_3hlzs: "",      // Time of accident
    text_4wufn: "",      // Report Number
    text_5qpwm: "",      // Location of Accident
    text_6pqfk: "",      // Witness(es)
    textarea_7whtc: "",  // Details of the Accident or Incident
    text_8tkig: "",      // Signed & Dated
    text_10caju: "",     // To whom was the incident reported?
    text_11enzl: "",     // Treatment received?
    text_12wgdw: "",     // Who treated?
    text_13bldx: "",     // Injured hospitalised?
    text_14qgjb: "",     // Was incident reported to HIQA?
    text_15jryq: "",     // Who reported event to HIQA?
    textarea_16zpca: "", // Comments/Observations and Preventative Action
    text_17smxr: "",     // Incident closed by
    text_18ibpf: "",     // E-Signature
    text_19nypf: ""      // Date (signature)
  });
  const [status, setStatus] = useState("");      // Status message for submission
  const [location, setLocation] = useState("Archview"); // Selected location

  // Handles changes to any input field
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Handles form submission and PDF generation
  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("Generating PDF...");

    // Load the template PDF from public folder
    const pdfUrl = process.env.PUBLIC_URL + "/accident_incident_report.pdf";
    const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pdfForm = pdfDoc.getForm();

    // Log all field names for debugging
    const fields = pdfForm.getFields();
    fields.forEach(f => {
      console.log(f.getName());
    });

    try {
      // Fill each field in the PDF with the form data
      Object.entries(form).forEach(([key, value]) => {
        try {
          pdfForm.getTextField(key).setText(value);
        } catch (err) {
          // Ignore if not a text field
        }
      });
      // Do NOT flatten, so PDF remains editable
      //pdfForm.flatten();

      // Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();

      // Send PDF to backend, including location, accident date, and time in query params
      const res = await fetch(
        `http://192.168.1.22:3001/api/save-accident-report-pdf?location=${location}&date=${form.text_2ovd}&time=${form.text_3hlzs}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: filledPdfBytes
        }
      );

      // Get date and time from your form state
      const reportDate = form.text_2ovd;   // adjust to your date field name
      const reportTime = form.text_3hlzs;  // adjust to your time field name

      // Send to backend to acknowledge matching alerts
      await fetch("http://192.168.1.22:3001/api/acknowledge-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: reportDate,
          time: reportTime,
          location // include selected location
        })
      });

      // Update status based on response
      if (res.ok) {
        setStatus("PDF Accident Report submitted successfully!");
      } else {
        setStatus("Failed to submit PDF Accident Report.");
      }
    } catch (err) {
      setStatus("Error filling PDF: " + err.message);
    }
  }

  // Render the form UI
  return (
    <div className="accident-report-container">
      {/* Form Title */}
      <h1 className="accident-report-title">
        Accident / Incident Report
      </h1>
      {/* Location Selector */}
      <div className="location-selector">
        <span>Choose Location:</span>
        <button
          type="button"
          className={`location-btn${location === "Archview" ? " selected" : ""}`}
          onClick={() => setLocation("Archview")}
        >
          Archview
        </button>
        <button
          type="button"
          className={`location-btn${location === "Hillcrest" ? " selected" : ""}`}
          onClick={() => setLocation("Hillcrest")}
        >
          Hillcrest
        </button>
      </div>
      <hr />

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        <div className="accident-form-section">
          {/* Name */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Name:</label>
            <input
              type="text"
              name="text_1zzfy"
              value={form.text_1zzfy}
              onChange={handleChange}
              required
              className="accident-form-input"
            />
          </div>
          {/* Date and Time of Accident */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Date:</label>
            <input
              type="date"
              name="text_2ovd"
              value={form.text_2ovd}
              onChange={handleChange}
              required
              className="accident-form-input"
            />
            <span style={{marginLeft: "24px", fontWeight: "bold", color: "#34495e"}}>Time of Accident:</span>
            <input
              type="time"
              name="text_3hlzs"
              value={form.text_3hlzs}
              onChange={handleChange}
              required
              className="accident-form-input"
              style={{width: "120px", marginLeft: "8px"}}
            />
          </div>
          {/* Report Number */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Report Number:</label>
            <input
              type="text"
              name="text_4wufn"
              value={form.text_4wufn}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Location of Accident */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Location of Accident:</label>
            <input
              type="text"
              name="text_5qpwm"
              value={form.text_5qpwm}
              onChange={handleChange}
              required
              className="accident-form-input"
            />
          </div>
          {/* Witness(es) */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Witness(es):</label>
            <input
              type="text"
              name="text_6pqfk"
              value={form.text_6pqfk}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Details of the Accident or Incident */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Details of the Accident or Incident:</label>
            <textarea
              name="textarea_7whtc"
              value={form.textarea_7whtc}
              onChange={handleChange}
              required
              rows={6}
              className="accident-form-textarea"
            />
          </div>
          {/* Signed & Dated */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Signed & Dated:</label>
            <input
              type="text"
              name="text_8tkig"
              value={form.text_8tkig}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* To whom was the incident reported? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">To whom was the incident reported?</label>
            <input
              type="text"
              name="text_10caju"
              value={form.text_10caju}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Treatment received? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Treatment received?</label>
            <input
              type="text"
              name="text_11enzl"
              value={form.text_11enzl}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Who treated? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Who treated?</label>
            <input
              type="text"
              name="text_12wgdw"
              value={form.text_12wgdw}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Injured hospitalised? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Injured hospitalised?</label>
            <input
              type="text"
              name="text_13bldx"
              value={form.text_13bldx}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Was incident reported to HIQA? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Was incident reported to HIQA?</label>
            <input
              type="text"
              name="text_14qgjb"
              value={form.text_14qgjb}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Who reported event to HIQA? */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Who reported event to HIQA?</label>
            <input
              type="text"
              name="text_15jryq"
              value={form.text_15jryq}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* Comments/Observations and Preventative Action */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Comments/ Observations and Preventative Action:</label>
            <textarea
              name="textarea_16zpca"
              value={form.textarea_16zpca}
              onChange={handleChange}
              rows={6}
              className="accident-form-textarea"
            />
          </div>
          {/* Incident closed by */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Incident closed by:</label>
            <input
              type="text"
              name="text_17smxr"
              value={form.text_17smxr}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
          {/* E-Signature */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">E-Signature:</label>
            <input
              type="text"
              name="text_18ibpf"
              value={form.text_18ibpf}
              onChange={handleChange}
              placeholder="Type your name as signature"
              className="accident-form-input"
            />
          </div>
          {/* Date (signature) */}
          <div style={{marginBottom: "16px"}}>
            <label className="accident-form-label">Date:</label>
            <input
              type="date"
              name="text_19nypf"
              value={form.text_19nypf}
              onChange={handleChange}
              className="accident-form-input"
            />
          </div>
        </div>
        {/* Submit Button */}
        <div style={{textAlign: "center"}}>
          <button
            type="submit"
            className="accident-form-submit"
          >
            Submit & Generate PDF
          </button>
        </div>
      </form>
      {/* Status Message */}
      {status && <div className="status-message">{status}</div>}
    </div>
  );
}

export default AccidentReportPdfPage;