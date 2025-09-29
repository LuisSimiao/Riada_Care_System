import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DeviceDashboardSelector from "./DeviceDashboardSelector";
import DashboardPage from "./DashboardPage";
import AccidentReportPdfPage from "./AccidentReportPdfPage";
import LoginPage from "./LoginPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Persist login state in sessionStorage
    return sessionStorage.getItem("isAuthenticated") === "true";
  });

  function handleLogin() {
    setIsAuthenticated(true);
    sessionStorage.setItem("isAuthenticated", "true");
  }

  function handleLogout() {
    setIsAuthenticated(false);
    sessionStorage.removeItem("isAuthenticated");
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <DeviceDashboardSelector onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DashboardPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/accident-report-pdf"
          element={
            isAuthenticated ? (
              <AccidentReportPdfPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;