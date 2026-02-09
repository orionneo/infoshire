import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const {
    lang = 'pt-BR',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Verificar se o navegador suporta Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition não suportado neste navegador');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Criar instância do reconhecimento
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition iniciado');
      setIsListening(true);
      isStoppingRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (finalText) {
        setTranscript((prev) => {
          const newTranscript = prev + (prev ? ' ' : '') + finalText;
          onResult?.(newTranscript);
          return newTranscript;
        });
      }

      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event);
      
      // Ignorar erro 'aborted' se estamos parando intencionalmente
      if (event.error === 'aborted' && isStoppingRef.current) {
        return;
      }

      let errorMessage = 'Erro ao reconhecer fala';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada. Tente novamente.';
          break;
        case 'audio-capture':
          errorMessage = 'Microfone não encontrado. Verifique as permissões.';
          break;
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada. Habilite nas configurações do navegador.';
          break;
        case 'network':
          errorMessage = 'Erro de rede. Verifique sua conexão.';
          break;
        case 'aborted':
          // Não mostrar erro se foi abortado intencionalmente
          if (!isStoppingRef.current) {
            errorMessage = 'Reconhecimento de fala interrompido.';
          } else {
            return; // Não chamar onError
          }
          break;
        case 'service-not-allowed':
          errorMessage = 'Serviço de reconhecimento não permitido. Verifique as permissões.';
          break;
      }

      onError?.(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition finalizado');
      setIsListening(false);
      setInterimTranscript('');
      
      // Limpar timeout de restart se existir
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          isStoppingRef.current = true;
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error aborting recognition:', error);
        }
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [lang, continuous, interimResults, onResult, onError]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      console.error('Recognition não inicializado');
      return;
    }

    if (isListening) {
      console.warn('Já está ouvindo');
      return;
    }

    try {
      // Solicitar permissão de microfone explicitamente (importante para mobile/PWA)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Parar o stream imediatamente - só precisamos da permissão
          stream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          console.error('Erro ao solicitar permissão de microfone:', permError);
          onError?.('Permissão de microfone negada. Habilite nas configurações do dispositivo.');
          return;
        }
      }

      // Garantir que não há instância anterior rodando
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignorar erro se não estava rodando
      }

      // Pequeno delay para garantir que o abort foi processado
      await new Promise(resolve => setTimeout(resolve, 100));

      isStoppingRef.current = false;
      recognitionRef.current.start();
      console.log('Iniciando reconhecimento de voz...');
    } catch (error: any) {
      console.error('Error starting recognition:', error);
      
      // Se o erro for que já está rodando, tentar parar e reiniciar
      if (error.message && error.message.includes('already started')) {
        try {
          recognitionRef.current.stop();
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 200);
        } catch (e) {
          console.error('Erro ao reiniciar:', e);
        }
      } else {
        onError?.('Erro ao iniciar reconhecimento de voz. Tente novamente.');
      }
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    if (!isListening) {
      console.warn('Não está ouvindo');
      return;
    }

    try {
      isStoppingRef.current = true;
      recognitionRef.current.stop();
      console.log('Parando reconhecimento de voz...');
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
