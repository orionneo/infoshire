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
  const params = currentUrl.searchParams;
  const pathParam = params.get("p");
  const queryParam = params.get("q");
  const hashParam = params.get("h");

  if (pathParam) {
    const targetPath = pathParam;
    if (!isSafeRedirectPath(targetPath)) {
      return;
    }
    const targetSearch = queryParam ? `?${queryParam}` : "";
    const targetHash = hashParam ? `#${hashParam}` : "";
    const target = `${targetPath}${targetSearch}${targetHash}`;

    window.history.replaceState({}, "", target);
    console.log("[bootstrap] restored redirect", { source: "p", target });
    return;
  }

  const redirect = params.get("__redirect");

  if (!redirect || !isSafeRedirectPath(redirect)) {
    return;
  }

  window.history.replaceState({}, "", redirect);
  console.log("[bootstrap] restored redirect", {
    source: "__redirect",
    target: redirect,
  });
  return;
}

restoreRedirect();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
