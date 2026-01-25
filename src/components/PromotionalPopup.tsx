import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPopupConfig } from '@/db/api';
import type { PopupConfig } from '@/types/types';

const POPUP_STORAGE_KEY = 'popup_closed_at';
const POPUP_EXPIRY_HOURS = 24; // Mostrar novamente após 24 horas

export function PromotionalPopup() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopupConfig();
  }, []);

  const loadPopupConfig = async () => {
    try {
      setLoading(true);
      const popupConfig = await getPopupConfig();
      
      if (popupConfig && popupConfig.is_active) {
        setConfig(popupConfig);
        
        // Verificar se o popup foi fechado recentemente
        const closedAt = localStorage.getItem(POPUP_STORAGE_KEY);
        if (closedAt) {
          const closedTime = new Date(closedAt).getTime();
          const now = new Date().getTime();
          const hoursPassed = (now - closedTime) / (1000 * 60 * 60);
          
          // Se passou mais de X horas, mostrar novamente
          if (hoursPassed >= POPUP_EXPIRY_HOURS) {
            setOpen(true);
          }
        } else {
          // Primeira vez, mostrar o popup
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar popup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Salvar timestamp de quando foi fechado
    localStorage.setItem(POPUP_STORAGE_KEY, new Date().toISOString());
  };

  if (loading || !config) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>
        
        <DialogHeader>
          <DialogTitle className="text-2xl">{config.title}</DialogTitle>
          {config.description && (
            <DialogDescription className="text-base whitespace-pre-wrap">
              {config.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {config.image_url && (
            <a
              href="https://wa.me/5519993352727?text=Olá,%20estou%20vindo%20do%20seu%20website,%20gostaria%20de%20uma%20avaliação%20gratuita."
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img
                src={config.image_url}
                alt={config.title}
                className="w-full object-cover max-h-96"
              />
            </a>
          )}

          <Button onClick={handleClose} className="w-full" size="lg">
            {config.button_text}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
