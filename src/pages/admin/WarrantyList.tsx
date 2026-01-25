import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Filter, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getOrdersInWarranty, getWarrantiesExpiringSoon, getAllProfiles } from '@/db/api';
import { ServiceOrderWithClient, Profile } from '@/types/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function WarrantyList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ServiceOrderWithClient[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<any[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [filters, setFilters] = useState({
    clientId: 'all',
    startDate: '',
    endDate: '',
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, expiringData, clientsData] = await Promise.all([
        getOrdersInWarranty(),
        getWarrantiesExpiringSoon(),
        getAllProfiles(),
      ]);
      setOrders(ordersData);
      setExpiringSoon(expiringData);
      // Filtrar apenas clientes (role = 'client')
      setClients(clientsData.filter(p => p.role === 'client'));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as informações de garantia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const handleFilter = async () => {
    setLoading(true);
    try {
      const data = await getOrdersInWarranty({
        clientId: filters.clientId && filters.clientId !== 'all' ? filters.clientId : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setOrders(data);
    } catch (error) {
      console.error('Erro ao filtrar:', error);
      toast({
        title: 'Erro ao filtrar',
        description: 'Não foi possível aplicar os filtros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setFilters({
      clientId: 'all',
      startDate: '',
      endDate: '',
    });
    loadData();
  };

  // Exportar para CSV
  const handleExport = () => {
    const csvContent = [
      ['OS', 'Cliente', 'Equipamento', 'Série', 'Conclusão', 'Fim Garantia', 'Dias Restantes'].join(';'),
      ...orders.map((order) => {
        const daysRemaining = calculateDaysRemaining(order.data_fim_garantia);
        return [
          order.order_number,
          order.client?.name || '',
          order.equipment,
          order.serial_number || '',
          order.data_conclusao ? format(new Date(order.data_conclusao), 'dd/MM/yyyy', { locale: ptBR }) : '',
          order.data_fim_garantia ? format(new Date(order.data_fim_garantia), 'dd/MM/yyyy', { locale: ptBR }) : '',
          daysRemaining.toString(),
        ].join(';');
      }),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `garantias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Exportado com sucesso',
      description: 'O arquivo CSV foi baixado',
    });
  };

  // Calcular dias restantes
  const calculateDaysRemaining = (dataFimGarantia: string | null): number => {
    if (!dataFimGarantia) return 0;
    const now = new Date();
    const end = new Date(dataFimGarantia);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 xl:w-7 xl:h-7" />
            Ordens em Garantia
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe todas as ordens de serviço dentro do período de garantia
          </p>
        </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 xl:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Garantia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ordens ativas com garantia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expirando em Breve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{expiringSoon.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(orders.map((o) => o.client_id)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Com garantias ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de garantias expirando */}
      {expiringSoon.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              Garantias Expirando em Breve
            </CardTitle>
            <CardDescription>
              {expiringSoon.length} garantia(s) expirarão nos próximos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSoon.slice(0, 3).map((warranty) => (
                <div
                  key={warranty.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/admin/orders/${warranty.id}`)}
                >
                  <div>
                    <p className="font-medium">OS #{warranty.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {warranty.client_name} - {warranty.equipment}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {warranty.dias_restantes} dia(s)
                  </Badge>
                </div>
              ))}
              {expiringSoon.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  E mais {expiringSoon.length - 3} garantia(s)...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={filters.clientId}
                onValueChange={(value) => setFilters({ ...filters, clientId: value })}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={handleFilter} disabled={loading} className="flex-1">
                Aplicar
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ordens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ordens em Garantia ({orders.length})</CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={orders.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma ordem em garantia encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const daysRemaining = calculateDaysRemaining(order.data_fim_garantia);
                const isExpiringSoon = daysRemaining <= 7;

                return (
                  <div
                    key={order.id}
                    className="flex flex-col xl:flex-row xl:items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">OS #{order.order_number}</h3>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Expira em breve
                          </Badge>
                        )}
                        {order.retorno_garantia && (
                          <Badge variant="secondary">Retorno</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.client?.name || 'Cliente não informado'} - {order.equipment}
                      </p>
                      {order.serial_number && (
                        <p className="text-xs text-muted-foreground">Série: {order.serial_number}</p>
                      )}
                    </div>

                    <Separator className="my-3 xl:hidden" />

                    <div className="xl:w-80 grid grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Conclusão</p>
                        <p className="font-medium">
                          {order.data_conclusao
                            ? format(new Date(order.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Fim Garantia</p>
                        <p className="font-medium">
                          {order.data_fim_garantia
                            ? format(new Date(order.data_fim_garantia), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </p>
                      </div>
                      <div className="col-span-2 xl:col-span-1">
                        <p className="text-muted-foreground text-xs">Dias Restantes</p>
                        <div className="flex items-center gap-2">
                          <p className={`font-bold ${isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
                            {daysRemaining}
                          </p>
                          {isExpiringSoon ? (
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
