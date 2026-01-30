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

function getEffectivePathname(locationPathname: string) {
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get('p'); // GH Pages restore param
    if (locationPathname === '/' && p && p.startsWith('/')) return p;
  } catch {}
  return locationPathname;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoggedPkceDebug = useRef(false);

  useEffect(() => {
    if (loading) return;
    const effectivePath = getEffectivePathname(location.pathname);
    if (effectivePath === '/auth/callback') {
      return;
    }

    const isPublic = matchPublicRoute(effectivePath, PUBLIC_ROUTES);

    let pkceDebug = false;
    let pParam: string | null = null;
    try {
      const url = new URL(window.location.href);
      pkceDebug = url.searchParams.get('pkce_debug') === '1';
      pParam = url.searchParams.get('p');
    } catch {}
    if (pkceDebug && !hasLoggedPkceDebug.current) {
      hasLoggedPkceDebug.current = true;
      console.log('[RouteGuard] pkce_debug', {
        pathname: location.pathname,
        search: location.search,
        p: pParam,
        effectivePath,
        isPublic,
        userId: user?.id,
        loading,
      });
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
