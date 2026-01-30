import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { supabase } from "./db/supabase";

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

function parseQueryString(raw: string) {
  const trimmed = raw.startsWith("?") ? raw.slice(1) : raw;
  return new URLSearchParams(trimmed);
}

function parseCallbackParams() {
  const url = new URL(window.location.href);
  const pathname = url.pathname;
  const search = url.search;
  const p = url.searchParams.get("p");
  const q = url.searchParams.get("q");
  const effectivePath = pathname === "/" && p && p.startsWith("/") ? p : pathname;
  const directParams = url.searchParams;
  let qParams = new URLSearchParams();
  if (q) {
    let decoded = q;
    if (decoded.includes("%")) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {}
    }
    qParams = parseQueryString(decoded);
  }
  const code = directParams.get("code") || qParams.get("code");
  const next = directParams.get("next") || qParams.get("next");
  return { pathname, search, p, q, effectivePath, code, next };
}

function getPkceStorageKeys(storage: Storage) {
  try {
    return Object.keys(storage).filter((key) => /supabase|pkce|verifier|code/i.test(key));
  } catch {
    return [];
  }
}

function isSafeNextPath(target: string | null) {
  if (!target) {
    return false;
  }
  if (!isSafeRedirectPath(target)) {
    return false;
  }
  return !target.startsWith("/admin");
}

async function tryHandlePkceCallback(): Promise<boolean> {
  const { pathname, search, p, q, effectivePath, code, next } = parseCallbackParams();
  const pkceDebug = new URL(window.location.href).searchParams.get("pkce_debug") === "1";
  if (pkceDebug) {
    console.log("[bootstrap] pkce_debug", {
      href: window.location.href,
      pathname,
      search,
      p,
      q,
      effectivePath,
      codePresent: Boolean(code),
    });
    console.log("[bootstrap] pkce_debug storage", {
      localStorageKeys: getPkceStorageKeys(localStorage),
      sessionStorageKeys: getPkceStorageKeys(sessionStorage),
    });
  }

  if (effectivePath !== "/auth/callback" || !code) {
    return false;
  }

  console.log("[bootstrap] oauth callback detected");
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[bootstrap] exchangeCodeForSession error", error);
      return false;
    }
  } catch (error) {
    console.error("[bootstrap] exchangeCodeForSession exception", error);
    return false;
  }

  const safeNext = isSafeNextPath(next) && next ? next : "/client";
  window.history.replaceState({}, document.title, effectivePath);
  window.location.replace(safeNext);
  return true;
}

async function bootstrapApp() {
  restoreRedirect();
  const handled = await tryHandlePkceCallback();
  if (handled) {
    return;
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppWrapper>
        <App />
      </AppWrapper>
    </StrictMode>
  );
}

bootstrapApp();
