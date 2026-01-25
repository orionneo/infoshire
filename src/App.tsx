import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
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

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <StatePersistence>
          <RouteGuard>
            <ScrollToTop />
            <IntersectObserver />
            <AnalyticsTracker />
            {/* Global Gamer Background - afeta TODAS as páginas */}
            <GlobalGamerBackground />
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
        </StatePersistence>
      </AuthProvider>
    </Router>
  );
};

export default App;
