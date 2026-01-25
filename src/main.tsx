import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// Force rebuild - v98 - Added Telegram test button in settings
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
