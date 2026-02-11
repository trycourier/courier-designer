import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import TestApp from "./TestApp";
import FullCycleTestApp from "./FullCycleTestApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/test-app" element={<TestApp />} />
        <Route path="/full-cycle-test" element={<FullCycleTestApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
