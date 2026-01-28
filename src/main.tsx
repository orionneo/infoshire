import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

const restoreRedirectFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectParam = params.get("__redirect");
  if (!redirectParam) {
    return;
  }

  const decodedPath = decodeURIComponent(redirectParam);
  const safePath = decodedPath.startsWith("/") ? decodedPath : "/";
  window.history.replaceState({}, document.title, safePath);
};

const redirectHashOAuthToCallback = () => {
  const { hash, pathname, search } = window.location;
  if (!hash || pathname === "/auth/callback") {
    return;
  }

  const hasAuthHash =
    hash.includes("access_token=") || hash.includes("refresh_token=");
  if (!hasAuthHash) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const rawNext = currentUrl.searchParams.get("next");
  const isSafeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("http");

  const redirectUrl = new URL("/auth/callback", currentUrl.origin);
  if (isSafeNext) {
    redirectUrl.searchParams.set("next", rawNext);
  }

  window.location.replace(`${redirectUrl.pathname}${redirectUrl.search}${hash}`);
};

restoreRedirectFromQuery();
redirectHashOAuthToCallback();

// Force rebuild - v98 - Added Telegram test button in settings
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
