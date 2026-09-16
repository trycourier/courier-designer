import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import TestApp from "./TestApp";
import AutocompleteTestApp from "./AutocompleteTestApp";
import CrossChannelTestApp from "./CrossChannelTestApp";
import FullCycleTestApp from "./FullCycleTestApp";
import ReadOnlyTestApp from "./ReadOnlyTestApp";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/test-app" element={<TestApp />} />
        <Route path="/test-app-autocomplete" element={<AutocompleteTestApp />} />
        <Route path="/test-app-cross-channel" element={<CrossChannelTestApp />} />
        <Route path="/full-cycle-test" element={<FullCycleTestApp />} />
        <Route path="/readonly-test" element={<ReadOnlyTestApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
