import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { searchWarranty } from '@/db/api';
import { ServiceOrderWithClient } from '@/types/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WarrantySearch() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    equipment: '',
    serialNumber: '',
  });
  const [results, setResults] = useState<ServiceOrderWithClient[]>([]);
  const [searched, setSearched] = useState(false);

  // Buscar garantia
  const handleSearch = async () => {
    if (!searchParams.equipment && !searchParams.serialNumber) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha pelo menos o equipamento ou número de série',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await searchWarranty({
        equipment: searchParams.equipment,
        serialNumber: searchParams.serialNumber,
      });
      setResults(data);
      setSearched(true);

      if (data.length === 0) {
        toast({
          title: 'Nenhum resultado',
          description: 'Não foram encontradas ordens de serviço com os critérios informados',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar garantia:', error);
      toast({
        title: 'Erro ao buscar',
        description: 'Não foi possível buscar as informações de garantia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular dias restantes de garantia
  const calculateDaysRemaining = (dataFimGarantia: string | null): number => {
    if (!dataFimGarantia) return 0;
    const now = new Date();
    const end = new Date(dataFimGarantia);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Renderizar badge de status de garantia
  const renderWarrantyBadge = (order: ServiceOrderWithClient) => {
    if (!order.data_fim_garantia) {
      return <Badge variant="secondary">Sem garantia</Badge>;
    }

    if (order.em_garantia) {
      const daysRemaining = calculateDaysRemaining(order.data_fim_garantia);
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Em garantia ({daysRemaining} dias)
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Garantia expirada
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 xl:w-7 xl:h-7" />
            Busca Rápida de Garantia
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte o histórico de ordens de serviço e verifique o status da garantia
          </p>
        </div>

      {/* Formulário de Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar por Equipamento</CardTitle>
          <CardDescription>
            Informe o equipamento ou número de série para consultar o histórico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamento</Label>
              <Input
                id="equipment"
                placeholder="Ex: iPhone 12, Notebook Dell..."
                value={searchParams.equipment}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, equipment: e.target.value })
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Número de Série / Etiqueta</Label>
              <Input
                id="serialNumber"
                placeholder="Ex: ABC123456..."
                value={searchParams.serialNumber}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, serialNumber: e.target.value })
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full xl:w-auto mt-4"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Buscando...' : 'Buscar Garantia'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {results.length > 0
                ? `${results.length} ordem(ns) encontrada(s)`
                : 'Nenhuma ordem encontrada'}
            </h2>
          </div>

          {results.length > 0 && (
            <div className="grid gap-4">
              {results.map((order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <CardContent className="p-4 xl:p-6">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      {/* Informações principais */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              OS #{order.order_number}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {order.client?.name || 'Cliente não informado'}
                            </p>
                          </div>
                          {renderWarrantyBadge(order)}
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Equipamento:</span>
                            <span>{order.equipment}</span>
                          </div>
                          {order.serial_number && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Série:</span>
                              <span>{order.serial_number}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <Badge variant="outline">{getStatusLabel(order.status)}</Badge>
                          </div>
                        </div>

                        {order.retorno_garantia && (
                          <Badge variant="secondary" className="w-fit">
                            <Clock className="w-3 h-3 mr-1" />
                            Retorno de Garantia
                          </Badge>
                        )}
                      </div>

                      {/* Informações de garantia */}
                      {order.data_fim_garantia && (
                        <div className="xl:w-64 space-y-2 p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold text-sm">Informações de Garantia</h4>
                          <Separator />
                          {order.data_conclusao && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Conclusão:</span>
                              <p className="font-medium">
                                {format(new Date(order.data_conclusao), "dd/MM/yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="text-muted-foreground">Fim da garantia:</span>
                            <p className="font-medium">
                              {format(new Date(order.data_fim_garantia), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          {order.data_retirada && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Retirada:</span>
                              <p className="font-medium">
                                {format(new Date(order.data_retirada), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

// Helper para traduzir status
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Recebido',
    analyzing: 'Em análise',
    awaiting_approval: 'Aguardando aprovação',
    approved: 'Aprovado',
    not_approved: 'Não aprovado',
    in_repair: 'Em reparo',
    awaiting_parts: 'Aguardando peças',
    completed: 'Finalizado',
    ready_for_pickup: 'Pronto para retirada',
  };
  return labels[status] || status;
}
