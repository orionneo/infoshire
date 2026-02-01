import { MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * ActionBar - Barra de ações fixa APENAS para mobile
 * 
 * Desktop: Botões integrados no header (não usa este componente)
 * Mobile: Barra fixa na parte inferior
 * 
 * Botões:
 * - Falar no WhatsApp (primário)
 * - Rastrear Ordem de Serviço (secundário - público, sem login)
 */
export function ActionBar() {
  const whatsappNumber = '5519993352727';
  const whatsappMessage = encodeURIComponent('Olá, estou vindo do site');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <>
      {/* Mobile APENAS - Barra fixa na parte inferior */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-primary/20 safe-area-bottom">
        <div className="grid grid-cols-2 gap-2 p-3">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex flex-col items-center justify-center h-16 gap-1"
            asChild
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">WhatsApp</span>
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary font-semibold flex flex-col items-center justify-center h-16 gap-1"
            asChild
          >
            <Link to="/rastrear-os">
              <Search className="h-5 w-5" />
              <span className="text-xs">Rastrear OS</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Spacer para evitar que o conteúdo fique escondido - MOBILE APENAS */}
      <div className="xl:hidden h-[88px]" />
    </>
  );
}
