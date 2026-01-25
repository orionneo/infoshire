import { Check, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/ui/voice-input';
import { cn } from '@/lib/utils';

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  enableVoiceInput?: boolean; // Nova prop para habilitar voice input
}

// Problemas comuns em assistências técnicas
const COMMON_PROBLEMS = [
  // Problemas de Hardware - Geral
  'Não liga',
  'Não carrega',
  'Bateria não carrega',
  'Bateria viciada',
  'Superaquecimento',
  'Desliga sozinho',
  'Reinicia sozinho',
  'Travando',
  'Lentidão',
  
  // Tela e Display
  'Tela quebrada',
  'Tela trincada',
  'Tela piscando',
  'Tela escura',
  'Tela com manchas',
  'Tela não acende',
  'Pixels mortos',
  'Troca de tela',
  'Touch screen não funciona',
  
  // Conectores e Portas
  'Conector quebrado',
  'Conector de carga com defeito',
  'Porta USB com defeito',
  'Porta HDMI não funciona',
  'Entrada de fone com defeito',
  'Conector solto',
  
  // Áudio
  'Sem áudio',
  'Som chiando',
  'Som baixo',
  'Microfone não funciona',
  'Alto-falante com defeito',
  'Fone não funciona',
  
  // Conectividade
  'Não conecta WiFi',
  'WiFi lento',
  'Bluetooth não funciona',
  'Sem sinal',
  'Não reconhece chip',
  'Problema de rede',
  
  // Botões e Controles
  'Botão não funciona',
  'Botão power com defeito',
  'Botão de volume travado',
  'Teclado com defeito',
  'Teclas não respondem',
  'Touchpad não responde',
  
  // Câmera
  'Câmera não funciona',
  'Câmera embaçada',
  'Câmera com defeito',
  'Webcam não funciona',
  
  // Armazenamento
  'Não reconhece HD/SSD',
  'HD com defeito',
  'SSD não detectado',
  'Memória cheia',
  'Backup de dados',
  
  // Software
  'Vírus/malware',
  'Sistema operacional corrompido',
  'Sistema lento',
  'Senha esquecida',
  'Não inicializa',
  'Tela azul (BSOD)',
  'Erro de sistema',
  'Atualização necessária',
  'Formatação',
  'Instalação de software',
  'Restauração de sistema',
  
  // Manutenção
  'Higienização completa',
  'Limpeza interna',
  'Troca de pasta térmica',
  'Manutenção preventiva',
  'Revisão geral',
  
  // Líquidos
  'Molhou',
  'Caiu na água',
  'Derramou líquido',
  'Oxidação',
  
  // Outros
  'Queda',
  'Impacto',
  'Garantia',
  'Orçamento',
  'Avaliação técnica',
];

const STORAGE_KEY = 'smart_textarea_history';
const MAX_HISTORY = 20;

export function SmartTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
  className,
  id,
  onKeyDown,
  enableVoiceInput = false, // Padrão: desabilitado
}: SmartTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isInteractingWithSuggestions, setIsInteractingWithSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handler para voice input
  const handleVoiceTranscript = (transcript: string) => {
    onChange(transcript);
  };

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }, []);

  // Salvar no histórico quando o valor mudar e não estiver vazio
  const saveToHistory = (text: string) => {
    if (!text.trim() || text.length < 10) return;

    const newHistory = [text, ...history.filter(h => h !== text)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  };

  // Filtrar sugestões baseado no texto digitado
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = value.toLowerCase();
    const lastLine = value.split('\n').pop()?.toLowerCase() || '';

    // Combinar problemas comuns e histórico
    const allSuggestions = [...COMMON_PROBLEMS, ...history];
    
    // Filtrar sugestões que correspondem ao texto
    const filtered = allSuggestions
      .filter(s => 
        s.toLowerCase().includes(searchTerm) || 
        s.toLowerCase().includes(lastLine)
      )
      .filter(s => s.toLowerCase() !== value.toLowerCase())
      .slice(0, 8);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value, history]);

  // Adicionar sugestão ao texto
  const addSuggestion = (suggestion: string) => {
    const currentValue = value.trim();
    const newValue = currentValue 
      ? `${currentValue}\n${suggestion}` 
      : suggestion;
    
    onChange(newValue);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Substituir texto com sugestão
  const replaceSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Se não há sugestões visíveis, apenas chamar onKeyDown customizado
    if (!showSuggestions || suggestions.length === 0) {
      if (onKeyDown) {
        onKeyDown(e);
      }
      return;
    }

    // Se há sugestões, processar navegação primeiro
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
      return;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
      return;
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      addSuggestion(suggestions[selectedIndex]);
      return;
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }

    // Se não foi nenhuma tecla de navegação, chamar onKeyDown customizado
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Salvar no histórico ao perder foco
  const handleBlur = () => {
    // Só fechar se não estiver interagindo com sugestões
    if (!isInteractingWithSuggestions) {
      setShowSuggestions(false);
      if (value.trim()) {
        saveToHistory(value.trim());
      }
    }
  };

  // Prevenir fechamento ao interagir com sugestões
  const handleSuggestionMouseDown = () => {
    setIsInteractingWithSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addSuggestion(suggestion);
    setIsInteractingWithSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleSuggestionReplace = (suggestion: string) => {
    replaceSuggestion(suggestion);
    setIsInteractingWithSuggestions(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(enableVoiceInput && 'pr-12', className)}
        />
        
        {/* Botão de Voice Input */}
        {enableVoiceInput && !disabled && (
          <div className="absolute right-2 top-2">
            <VoiceInput 
              onTranscript={handleVoiceTranscript}
              appendMode={true}
            />
          </div>
        )}
      </div>

      {/* Sugestões rápidas - sempre visíveis */}
      {!disabled && !value && (
        <div className="mt-2 flex flex-wrap gap-2">
          <p className="text-xs text-muted-foreground w-full mb-1">
            Problemas comuns (clique para adicionar):
          </p>
          {COMMON_PROBLEMS.slice(0, 6).map((problem) => (
            <Button
              key={problem}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSuggestion(problem)}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              {problem}
            </Button>
          ))}
        </div>
      )}

      {/* Dropdown de sugestões */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          onMouseDown={handleSuggestionMouseDown}
        >
          <div className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">
              Sugestões (↑↓ para navegar, Enter para adicionar):
            </p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  selectedIndex === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="text-sm flex-1">{suggestion}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSuggestionClick(suggestion);
                    }}
                    title="Adicionar ao texto"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSuggestionReplace(suggestion);
                    }}
                    title="Substituir texto"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
