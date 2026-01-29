import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

const restoreRedirectFromQuery = () => {
  const url = new URL(window.location.href);
  const redirectParam = url.searchParams.get("__redirect");
  if (!redirectParam) return;

  let target: URL | null = null;
  try {
    target = new URL(redirectParam, window.location.origin);
  } catch {
    target = null;
  }

  if (!target) return;

  url.searchParams.delete("__redirect");
  for (const [key, value] of url.searchParams.entries()) {
    if (!target.searchParams.has(key)) {
      target.searchParams.set(key, value);
    }
  }

  const finalUrl = `${target.pathname}${target.search}${url.hash || ""}`;
  window.history.replaceState({}, document.title, finalUrl);
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
