import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    
    if (isInstalled) {
      return;
    }

    // Verificar se o banner já foi fechado nesta sessão
    const bannerClosed = sessionStorage.getItem('pwa-banner-closed');
    if (bannerClosed) {
      return;
    }

    // Capturar o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Para iOS, mostrar banner com instruções
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !isInstalled) {
      setShowInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Se for iOS, mostrar instruções
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Para instalar no iOS:\n1. Toque no ícone de compartilhar\n2. Role para baixo e toque em "Adicionar à Tela de Início"');
      }
      return;
    }

    // Mostrar o prompt de instalação
    deferredPrompt.prompt();
    
    // Aguardar a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso');
    }
    
    // Limpar o prompt
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleClose = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-banner-closed', 'true');
  };

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top duration-500">
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 backdrop-blur-xl border-2 border-primary/50 rounded-lg shadow-[0_0_30px_rgba(139,255,0,0.3)] p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full animate-pulse"></div>
              <Download className="relative h-6 w-6 text-primary" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground mb-1">Instalar Aplicativo</h3>
            <p className="text-sm text-muted-foreground">
              Adicione o InfoShire à sua tela inicial para acesso rápido e experiência completa
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                Instalar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground"
              >
                Agora não
              </Button>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
