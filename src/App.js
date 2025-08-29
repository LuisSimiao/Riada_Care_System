import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DeviceDashboardSelector from "./DeviceDashboardSelector";
import DashboardPage from "./DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeviceDashboardSelector />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;