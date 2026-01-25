import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackSessionStart,
  trackPageView,
  setupClickTracking,
} from '@/services/analytics';

/**
 * Componente para rastrear analytics em páginas públicas
 * Deve ser incluído no App.tsx ou em layout público
 */
export function AnalyticsTracker() {
  const location = useLocation();
  const initialized = useRef(false);
  const path = location.pathname;
  const analyticsDisabled =
    path.startsWith('/admin') ||
    path === '/login' ||
    path === '/auth/callback';

  // Inicializar analytics uma única vez (sessão + click tracking)
  useEffect(() => {
    if (analyticsDisabled) {
      return;
    }

    if (!initialized.current) {
      // Iniciar sessão e configurar click tracking
      trackSessionStart().catch((error) => {
        console.error('[ANALYTICS] Falha ao iniciar sessão:', error);
      });
      
      // Configurar rastreamento de cliques
      setupClickTracking();
      
      initialized.current = true;
    }
  }, []);

  // Rastrear mudanças de página
  useEffect(() => {
    if (analyticsDisabled) {
      return;
    }

    const title = document.title || path;
    
    // Pequeno delay para garantir que o título da página foi atualizado
    const timer = setTimeout(() => {
      trackPageView(path, document.title || title).catch((error) => {
        console.error('[ANALYTICS] Falha ao registrar pageview:', error);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [analyticsDisabled, path]);

  // Componente não renderiza nada
  return null;
}
