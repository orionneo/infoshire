import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  continuous?: boolean;
  appendMode?: boolean; // Se true, adiciona ao texto existente; se false, substitui
}

export function VoiceInput({ 
  onTranscript, 
  className,
  continuous = false,
  appendMode = true,
}: VoiceInputProps) {
  const { toast } = useToast();
  const [accumulatedText, setAccumulatedText] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    lang: 'pt-BR',
    continuous,
    interimResults: true,
    onError: (error) => {
      setIsInitializing(false);
      toast({
        title: 'Erro no reconhecimento de voz',
        description: error,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (transcript) {
      const newText = appendMode && accumulatedText 
        ? `${accumulatedText} ${transcript}`
        : transcript;
      
      setAccumulatedText(newText);
      onTranscript(newText);
    }
  }, [transcript]);

  // Atualizar estado quando começar a ouvir
  useEffect(() => {
    if (isListening) {
      setIsInitializing(false);
    }
  }, [isListening]);

  const handleToggle = async () => {
    if (isListening) {
      // Parar gravação
      stopListening();
      toast({
        title: 'Gravação finalizada',
        description: 'Transcrição concluída com sucesso',
      });
    } else {
      // Iniciar gravação
      if (!isSupported) {
        toast({
          title: 'Recurso não disponível',
          description: 'Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.',
          variant: 'destructive',
        });
        return;
      }

      setIsInitializing(true);
      resetTranscript();
      setAccumulatedText('');
      
      // Mostrar feedback imediato
      toast({
        title: 'Iniciando gravação...',
        description: 'Permita o acesso ao microfone quando solicitado',
      });

      try {
        await startListening();
        
        // Feedback de sucesso após iniciar
        setTimeout(() => {
          if (isListening) {
            toast({
              title: '🎤 Gravando',
              description: 'Fale agora. Clique novamente para finalizar.',
            });
          }
        }, 500);
      } catch (error) {
        setIsInitializing(false);
        console.error('Erro ao iniciar:', error);
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  const showLoader = isInitializing && !isListening;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isListening ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'relative transition-all',
              isListening && 'animate-pulse bg-red-600 hover:bg-red-700 border-red-600',
              showLoader && 'opacity-70',
              className
            )}
            onClick={handleToggle}
            disabled={showLoader}
          >
            {showLoader ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <>
                <MicOff className="h-4 w-4 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {showLoader ? (
            <p className="text-xs">Iniciando microfone...</p>
          ) : isListening ? (
            <>
              <p className="font-semibold">🔴 Gravando</p>
              <p className="text-xs mt-1">Clique para parar e finalizar</p>
              {interimTranscript && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  "{interimTranscript}"
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold">🎤 Gravar por voz</p>
              <p className="text-xs mt-1">Clique para começar a gravar</p>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
