import { Check, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  suggestions?: string[];
  storageKey?: string;
}

// Equipamentos comuns em assistências técnicas
const DEFAULT_EQUIPMENT = [
  // Computadores e Notebooks
  'Notebook',
  'Computador Desktop',
  'Ultrabook',
  'Chromebook',
  'MacBook',
  'iMac',
  
  // Dispositivos Móveis
  'Celular/Smartphone',
  'iPhone',
  'Tablet',
  'iPad',
  
  // Consoles - PlayStation
  'PlayStation 5 (PS5)',
  'PlayStation 4 (PS4)',
  'PlayStation 3 (PS3)',
  'PlayStation 2 (PS2)',
  'PlayStation 1 (PS1)',
  'PSP',
  'PS Vita',
  
  // Consoles - Xbox
  'Xbox Series X',
  'Xbox Series S',
  'Xbox One',
  'Xbox 360',
  'Xbox Classic',
  
  // Consoles - Nintendo
  'Nintendo Switch',
  'Nintendo Switch Lite',
  'Nintendo Wii U',
  'Nintendo Wii',
  'Nintendo GameCube',
  'Nintendo 64',
  'Super Nintendo (SNES)',
  'Nintendo DS',
  'Nintendo 3DS',
  
  // Consoles - Outros
  'Atari 2600',
  'Sega Genesis',
  'Sega Dreamcast',
  'Steam Deck',
  
  // Periféricos
  'Monitor',
  'Impressora',
  'Scanner',
  'Mouse',
  'Teclado',
  'Webcam',
  'Roteador',
  'Modem',
  
  // Áudio
  'Headset',
  'Fone de Ouvido',
  'Headphone',
  'Caixa de Som',
  'Soundbar',
  'Microfone',
  
  // Armazenamento
  'HD Externo',
  'SSD',
  'Pen Drive',
  'Cartão de Memória',
  
  // Componentes
  'Fonte de Alimentação',
  'Placa de Vídeo',
  'Placa-Mãe',
  'Memória RAM',
  'Processador',
  
  // Acessórios
  'Carregador',
  'Cabo HDMI',
  'Adaptador',
  'Controle/Joystick',
  'Teclado Gamer',
  'Mouse Gamer',
];

const MAX_HISTORY = 15;

export function SmartInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  suggestions = DEFAULT_EQUIPMENT,
  storageKey = 'smart_input_equipment_history',
}: SmartInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isInteractingWithSuggestions, setIsInteractingWithSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }, [storageKey]);

  // Salvar no histórico
  const saveToHistory = (text: string) => {
    if (!text.trim() || text.length < 3) return;

    const newHistory = [text, ...history.filter(h => h !== text)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  };

  // Filtrar sugestões baseado no texto digitado
  useEffect(() => {
    if (!value || value.length < 1) {
      // Mostrar sugestões comuns quando vazio
      setFilteredSuggestions(suggestions.slice(0, 8));
      return;
    }

    const searchTerm = value.toLowerCase();

    // Combinar sugestões padrão e histórico
    const allSuggestions = [...history, ...suggestions];
    
    // Filtrar sugestões que correspondem ao texto
    const filtered = allSuggestions
      .filter(s => s.toLowerCase().includes(searchTerm))
      .filter(s => s.toLowerCase() !== value.toLowerCase())
      .slice(0, 8);

    setFilteredSuggestions(filtered);
    setSelectedIndex(-1);
  }, [value, history, suggestions]);

  // Selecionar sugestão
  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setIsInteractingWithSuggestions(false);
    inputRef.current?.focus();
  };

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Salvar no histórico ao perder foco
  const handleBlur = () => {
    if (!isInteractingWithSuggestions) {
      setShowSuggestions(false);
      if (value.trim()) {
        saveToHistory(value.trim());
      }
    }
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  // Prevenir fechamento ao interagir com sugestões
  const handleSuggestionMouseDown = () => {
    setIsInteractingWithSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    selectSuggestion(suggestion);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />

      {/* Sugestões rápidas - sempre visíveis quando vazio */}
      {!disabled && !value && !showSuggestions && (
        <div className="mt-2 flex flex-wrap gap-2">
          <p className="text-xs text-muted-foreground w-full mb-1">
            Equipamentos comuns (clique para selecionar):
          </p>
          {suggestions.slice(0, 6).map((equipment) => (
            <Button
              key={equipment}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectSuggestion(equipment)}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              {equipment}
            </Button>
          ))}
        </div>
      )}

      {/* Dropdown de sugestões */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          onMouseDown={handleSuggestionMouseDown}
        >
          <div className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">
              {value ? 'Sugestões (↑↓ para navegar, Enter para selecionar):' : 'Equipamentos comuns:'}
            </p>
            {filteredSuggestions.map((suggestion, index) => (
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
                <Check className="h-4 w-4 opacity-50" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
