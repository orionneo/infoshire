import { Download, Smartphone, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt if on iOS and not standalone
    if (ios && !standalone && !dismissed) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or dismissed
  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="border-primary/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-sm">Instalar InfoShire</h3>
              {isIOS ? (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>Para instalar este app no seu iPhone:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Toque no ícone de compartilhar <span className="inline-block">⎙</span></li>
                    <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                    <li>Toque em "Adicionar"</li>
                  </ol>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Instale o app para acesso rápido e acompanhe suas ordens de serviço offline.
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              className="w-full mt-3 neon-hover"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
