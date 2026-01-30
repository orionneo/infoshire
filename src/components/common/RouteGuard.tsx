import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/403',
  '/404',
  '/',
  '/services',
  '/about',
  '/contact',
  '/init-admin',
  '/auth/callback',
];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

function parseQueryString(raw: string | null) {
  if (!raw) return new URLSearchParams();
  const trimmed = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(trimmed);
}

function getEffectivePathname(locationPathname: string) {
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('p'); // GH Pages restore param
    if (locationPathname === '/' && p && p.startsWith('/')) return p;
  } catch {}
  return locationPathname;
}

function getPkceCallbackInfo(locationPathname: string) {
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('p');
    const q = url.searchParams.get('q');
    const effectivePath = locationPathname === '/' && p && p.startsWith('/') ? p : locationPathname;
    const directParams = url.searchParams;
    const qParams = parseQueryString(q);
    const code = directParams.get('code') || qParams.get('code');
    return { effectivePath, codePresent: Boolean(code), p, q };
  } catch {
    return { effectivePath: locationPathname, codePresent: false, p: null, q: null };
  }
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoggedPkceDebug = useRef(false);

  useEffect(() => {
    if (loading) return;
    const { effectivePath, codePresent, p: pParam, q: qParam } = getPkceCallbackInfo(location.pathname);
    const isAuthCallback = effectivePath === '/auth/callback' || codePresent;
    const isPublic = isAuthCallback || matchPublicRoute(effectivePath, PUBLIC_ROUTES);

    let pkceDebug = false;
    try {
      const url = new URL(window.location.href);
      pkceDebug = url.searchParams.get('pkce_debug') === '1';
    } catch {}
    if (pkceDebug && !hasLoggedPkceDebug.current) {
      hasLoggedPkceDebug.current = true;
      console.log('[RouteGuard] pkce_debug', {
        pathname: location.pathname,
        search: location.search,
        p: pParam,
        q: qParam,
        effectivePath,
        isPublic,
        isAuthCallback,
        codePresent,
        userId: user?.id,
        loading,
      });
    }

    if (pkceDebug) {
      const decision = !user && !isPublic ? 'redirect_login' : 'allow';
      const rule = isAuthCallback
        ? 'oauth_callback'
        : !user && !isPublic
          ? 'requires_auth'
          : 'default';
      console.log('[RouteGuard] pkce_debug decision', { decision, rule });
    }

    if (!user && !isPublic) {
      navigate('/login', { state: { from: effectivePath }, replace: true });
      return;
    }

    const isAdminRoute = effectivePath.startsWith('/admin');
    if (user && profile && !isAdminRoute && profile.role !== 'admin') {
      const isClientRoute = effectivePath.startsWith('/client');
      const isCompleteProfileRoute = effectivePath === '/complete-profile';
      if (isClientRoute && !profile.phone && !isCompleteProfileRoute) {
        navigate('/complete-profile', { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, location.search, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
