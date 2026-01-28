import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

const restoreRedirectFromQuery = () => {
  const url = new URL(window.location.href);
  const redirectParam = url.searchParams.get("__redirect");
  if (!redirectParam) return;

  let decodedPath = "/";
  try {
    decodedPath = decodeURIComponent(redirectParam);
  } catch {
    decodedPath = "/";
  }

  const safePath =
    decodedPath.startsWith("/") && !decodedPath.startsWith("//") ? decodedPath : "/";

  // remove __redirect from query and restore path
  window.history.replaceState({}, document.title, safePath);
};

const redirectHashOAuthToCallback = () => {
  const { hash, pathname } = window.location;
  if (!hash || pathname === "/auth/callback") return;

  const hasAuthHash =
    hash.includes("access_token=") || hash.includes("refresh_token=");
  if (!hasAuthHash) return;

  const currentUrl = new URL(window.location.href);
  const rawNext = currentUrl.searchParams.get("next");
  const isSafeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("http");

  const redirectUrl = new URL("/auth/callback", currentUrl.origin);
  if (isSafeNext) redirectUrl.searchParams.set("next", rawNext);

  window.location.replace(`${redirectUrl.pathname}${redirectUrl.search}${hash}`);
};

restoreRedirectFromQuery();
redirectHashOAuthToCallback();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);