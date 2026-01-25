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

  // Inicializar analytics uma única vez (sessão + click tracking)
  useEffect(() => {
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
    const path = location.pathname;
    const title = document.title || path;
    
    // Pequeno delay para garantir que o título da página foi atualizado
    const timer = setTimeout(() => {
      trackPageView(path, document.title || title);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Componente não renderiza nada
  return null;
}
