import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { searchSiteContent } from '@/db/api';
import { Skeleton } from '@/components/ui/skeleton';

export function SearchBar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ type: string; title: string; content: string; sectionId?: string; url?: string; }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K ou Cmd+K para abrir busca
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // ESC para fechar
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await searchSiteContent(query);
        setResults(searchResults.settings);
      } catch (error) {
        console.error('Erro ao buscar:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleResultClick = (result: { sectionId?: string; url?: string }) => {
    handleClose();
    
    // Se tem URL específica, navegar para ela
    if (result.url) {
      navigate(result.url);
      
      // Se também tem sectionId, fazer scroll após navegação
      if (result.sectionId) {
        setTimeout(() => {
          const element = document.getElementById(result.sectionId!);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } else if (result.sectionId) {
      // Se só tem sectionId, navegar para home e fazer scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(result.sectionId!);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full xl:w-64 justify-start text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar no site</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite para buscar... (ex: nintendo, notebook, contato)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full bg-muted" />
                <Skeleton className="h-20 w-full bg-muted" />
                <Skeleton className="h-20 w-full bg-muted" />
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum resultado encontrado para "{query}"</p>
                <p className="text-sm mt-2">Tente usar outras palavras-chave</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground px-1">
                  {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </p>
                {results.map((result, index) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer hover:bg-accent hover:border-primary/50 transition-all"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {result.type}
                            </Badge>
                            <h3 className="font-medium text-sm">{result.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.content}
                          </p>
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            Clique para ver mais
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!query && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Digite algo para começar a buscar</p>
                <p className="text-xs mt-2">
                  Pressione <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+K</kbd> para abrir a busca rapidamente
                </p>
                <div className="mt-4 text-xs text-left max-w-sm mx-auto">
                  <p className="font-semibold mb-2">Exemplos de busca:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>nintendo, playstation, xbox</li>
                    <li>notebook, computador, mac</li>
                    <li>contato, telefone, endereço</li>
                    <li>rastrear, ordem de serviço</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
