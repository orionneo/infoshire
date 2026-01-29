import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

function isSafeRedirectPath(target: string) {
  if (!target.startsWith("/")) {
    return false;
  }
  if (target.startsWith("//")) {
    return false;
  }
  return !target.includes("://");
}

function restoreRedirect() {
  const currentUrl = new URL(window.location.href);
  const redirect = currentUrl.searchParams.get("__redirect");

  if (!redirect || !isSafeRedirectPath(redirect)) {
    return;
  }

  currentUrl.searchParams.delete("__redirect");

  const redirectUrl = new URL(redirect, window.location.origin);
  const mergedParams = new URLSearchParams(redirectUrl.searchParams);

  for (const [key, value] of currentUrl.searchParams.entries()) {
    mergedParams.append(key, value);
  }

  const mergedSearch = mergedParams.toString();
  const target = `${redirectUrl.pathname}${
    mergedSearch ? `?${mergedSearch}` : ""
  }${redirectUrl.hash}`;

  window.history.replaceState({}, "", target);
}

restoreRedirect();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
