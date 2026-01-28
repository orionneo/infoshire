import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

(function bootstrapBeforeReact() {
  try {
    const CANONICAL_HOST = "infoshire.com.br";
    const url = new URL(window.location.href);

    if (url.hostname !== CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      window.location.replace(url.toString());
      return;
    }

    const hasHashTokens = url.hash.includes("access_token=");
    const hasCode = url.searchParams.has("code");

    if ((hasHashTokens || hasCode) && url.pathname !== "/auth/callback") {
      const next = url.searchParams.get("next");
      const safeNext =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.includes("http") &&
        !next.includes("\\")
          ? next
          : "/client";
      const newUrl = new URL(url.toString());
      newUrl.pathname = "/auth/callback";
      newUrl.searchParams.set("next", safeNext);
      window.location.replace(`${newUrl.pathname}${newUrl.search}${url.hash}`);
      return;
    }
  } catch {
    // ignore
  }
})();

// Force rebuild - v98 - Added Telegram test button in settings
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
