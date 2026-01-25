import { useState } from 'react';
import { Search, Mail, AlertCircle, Loader2, Phone, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackOrdersByEmail, trackOrdersByPhone } from '@/db/api';
import PublicOrderDetails from '@/components/PublicOrderDetails';
import { Link } from 'react-router-dom';

type SearchMode = 'email' | 'phone';

export default function TrackOrder() {
  const [searchMode, setSearchMode] = useState<SearchMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);

  const handleSearch = async () => {
    setError('');
    setOrderData(null);
    setOrdersList([]);
    setLoading(true);

    try {
      if (searchMode === 'email') {
        if (!email.trim()) {
          setError('Por favor, informe o e-mail');
          return;
        }

        const results = await trackOrdersByEmail(email);
        
        if (!results || results.length === 0) {
          setError('Nenhuma ordem de serviço encontrada para este e-mail.');
          return;
        }

        setOrdersList(results);
      } else if (searchMode === 'phone') {
        if (!phone.trim()) {
          setError('Por favor, informe o telefone');
          return;
        }

        const results = await trackOrdersByPhone(phone);
        
        if (!results || results.length === 0) {
          setError('Nenhuma ordem de serviço encontrada para este telefone.');
          return;
        }

        setOrdersList(results);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar ordem de serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: any) => {
    setOrderData(order);
    setOrdersList([]);
  };

  const handleReset = () => {
    setOrderData(null);
    setOrdersList([]);
    setEmail('');
    setPhone('');
    setError('');
  };

  // Se já encontrou uma OS, mostra os detalhes
  if (orderData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col xl:flex-row gap-3 mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={handleReset}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Nova Consulta
          </Button>
          <Button
            variant="default"
            size="lg"
            asChild
            className="gap-2"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Voltar ao Site
            </Link>
          </Button>
        </div>
        <PublicOrderDetails order={orderData} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Botão de voltar ao site - Sempre visível */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="lg"
          asChild
          className="gap-2"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Site
          </Link>
        </Button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl xl:text-4xl font-bold mb-3 gradient-text">
          🔍 Rastrear Ordem de Serviço
        </h1>
        <p className="text-muted-foreground text-base xl:text-lg">
          Acompanhe o status do seu reparo em tempo real sem necessidade de login
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Escolha uma opção de consulta</CardTitle>
          <CardDescription>
            Você pode consultar pelo e-mail ou telefone cadastrado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Radio Group para escolher modo de busca */}
          <RadioGroup
            value={searchMode}
            onValueChange={(value) => {
              setSearchMode(value as SearchMode);
              setError('');
              setEmail('');
              setPhone('');
            }}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                Consultar por E-mail
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="phone" id="phone" />
              <Label htmlFor="phone" className="flex items-center gap-2 cursor-pointer">
                <Phone className="h-4 w-4" />
                Consultar por Telefone
              </Label>
            </div>
          </RadioGroup>

          {/* Formulário dinâmico baseado no modo */}
          <div className="space-y-4">
            {searchMode === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Informe o e-mail cadastrado no momento do atendimento
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(19) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Informe o telefone cadastrado no momento do atendimento
                </p>
              </div>
            )}

            {/* Mensagem de erro */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botão de busca */}
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar OS
                </>
              )}
            </Button>
          </div>

          {/* Lista de OS (quando busca por email) */}
          {ordersList.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">
                {ordersList.length} {ordersList.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}
              </h3>
              <div className="space-y-2">
                {ordersList.map((order) => (
                  <Card
                    key={order.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">OS #{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">{order.equipment}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Dica para fazer login */}
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              💡 Você também pode fazer login para acessar recursos completos como mensagens e histórico detalhado
            </p>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Fazer Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper para traduzir status
function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    received: 'Recebido',
    analyzing: 'Em Análise',
    awaiting_approval: 'Aguardando Aprovação',
    approved: 'Aprovado',
    not_approved: 'Não Aprovado',
    in_repair: 'Em Reparo',
    awaiting_parts: 'Aguardando Peças',
    completed: 'Concluído',
    ready_for_pickup: 'Pronto para Retirada',
  };
  return statusMap[status] || status;
}
