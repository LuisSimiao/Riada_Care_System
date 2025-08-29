import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DeviceDashboardSelector from "./DeviceDashboardSelector";
import DashboardPage from "./DashboardPage";
import AccidentReportPdfPage from "./AccidentReportPdfPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeviceDashboardSelector />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accident-report-pdf" element={<AccidentReportPdfPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;