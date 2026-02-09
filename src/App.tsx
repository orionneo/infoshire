import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { RouteGuard } from '@/components/common/RouteGuard';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { StatePersistence } from '@/components/common/StatePersistence';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import GlobalGamerBackground from '@/components/GlobalGamerBackground';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import routes from './routes';

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border/60 bg-card/80 p-6 text-center shadow-lg backdrop-blur-sm">
            <h1 className="text-xl font-semibold">
              Ops, ocorreu um erro inesperado
            </h1>
            <p className="text-sm text-muted-foreground">
              Tente recarregar a página para continuar.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Recarregar
            </button>
            <p className="text-xs text-muted-foreground">
              Se você usa o app como PWA, limpe o cache do navegador e tente
              novamente.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppShell: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthCallback = location.pathname === '/auth/callback';

  const appBody = (
      <RouteGuard>
      <ScrollToTop />
      <IntersectObserver />
      {!isAdminRoute && !isAuthCallback && <AnalyticsTracker />}
      {!isAdminRoute && <GlobalGamerBackground />}
      <div className="flex flex-col min-h-screen relative z-10">
        <main className="flex-grow">
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <PWAInstallPrompt />
      <ConnectionStatus />
      <Toaster />
    </RouteGuard>
  );

  return isAdminRoute ? appBody : <StatePersistence>{appBody}</StatePersistence>;
};

const App: React.FC = () => (
  <Router>
    <AuthProvider>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </AuthProvider>
  </Router>
);

export default App;
