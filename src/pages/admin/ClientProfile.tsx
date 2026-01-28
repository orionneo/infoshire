import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Loader2,
  Mail,
  Package,
  Phone,
  Shield,
  TrendingUp,
  User,
  Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getClientOrders, getClientStats, getProfile, updateProfile } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { Profile, ServiceOrderWithClient } from '@/types/types';

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [client, setClient] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<ServiceOrderWithClient[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  useEffect(() => {
    setPhoneDraft(client?.phone || '');
  }, [client]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!editButtonRef.current) return;

    const button = editButtonRef.current;
    const checkOverlay = () => {
      const rect = button.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      if (elementAtPoint && !button.contains(elementAtPoint)) {
        console.warn('[ClientProfile] Edit button blocked by:', elementAtPoint);
      }
    };

    const frame = requestAnimationFrame(checkOverlay);
    return () => cancelAnimationFrame(frame);
  }, [isEditing, loading]);

  const loadClientData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [clientData, ordersData, statsData] = await Promise.all([
        getProfile(id),
        getClientOrders(id),
        getClientStats(id),
      ]);

      setClient(clientData);
      setOrders(ordersData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    setPhoneDraft(client?.phone || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setPhoneDraft(client?.phone || '');
    setIsEditing(false);
  };

  const handleSaveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;

    const normalizedPhone = phoneDraft.replace(/\D/g, '');

    setSaving(true);
    try {
      const updatedClient = await updateProfile(client.id, {
        phone: normalizedPhone ? normalizedPhone : null,
      });

      setClient(updatedClient);
      setIsEditing(false);
      toast({
        title: 'Cliente atualizado',
        description: 'As informações do cliente foram salvas com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message || 'Não foi possível salvar as informações do cliente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getClientLoyaltyLevel = () => {
    if (!stats) return { level: 'Novo', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    
    const { totalOrders } = stats;
    if (totalOrders >= 10) return { level: 'VIP', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    if (totalOrders >= 5) return { level: 'Fiel', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (totalOrders >= 2) return { level: 'Regular', color: 'text-green-600', bgColor: 'bg-green-100' };
    return { level: 'Novo', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Clientes
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const loyalty = getClientLoyaltyLevel();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center justify-between relative z-50">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/clients')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Button>
          <Button
            onClick={handleStartEdit}
            className="gap-2 pointer-events-auto"
            type="button"
            ref={editButtonRef}
          >
            <Edit className="h-4 w-4" />
            Editar Cliente
          </Button>
        </div>

        {isEditing && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Editar Telefone</CardTitle>
              <CardDescription>Atualize o telefone do cliente sem sair desta página.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveClient} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <Input
                    value={phoneDraft}
                    onChange={(event) => setPhoneDraft(event.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Informações do Cliente */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{client.name || 'Nome não informado'}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Cliente desde {format(new Date(client.created_at), 'MMMM yyyy', { locale: ptBR })}
                  </CardDescription>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full ${loyalty.bgColor}`}>
                <span className={`font-semibold ${loyalty.color}`}>{loyalty.level}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{client.phone || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Última Visita</p>
                  <p className="font-medium">
                    {stats?.lastVisit
                      ? format(stats.lastVisit, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : 'Nenhuma visita'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/admin/orders')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedOrders || 0} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                De {stats?.revenueOrdersCount || 0} {(stats?.revenueOrdersCount || 0) === 1 ? 'ordem concluída' : 'ordens concluídas'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.avgRepairTime || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">dias de reparo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Garantia</CardTitle>
              <Shield className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats?.ordersInWarranty || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.warrantyReturns || 0} retornos ({stats?.warrantyReturnRate || 0}%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Equipamentos Mais Comuns */}
        {stats?.mostCommonEquipment && stats.mostCommonEquipment.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Equipamentos Mais Comuns
              </CardTitle>
              <CardDescription>Tipos de equipamentos mais trazidos por este cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.mostCommonEquipment.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <span className="font-medium">{item.equipment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(item.count / stats.totalOrders) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {item.count}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Operações comuns para este cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                className="w-full justify-start gap-2"
                onClick={() => navigate('/admin/orders/new', { state: { clientId: id, clientName: client.name } })}
              >
                <Package className="h-4 w-4" />
                Nova Ordem de Serviço
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 pointer-events-auto"
                onClick={handleStartEdit}
                type="button"
              >
                <Edit className="h-4 w-4" />
                Editar Informações
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  // Filtrar ordens deste cliente
                  navigate('/admin/orders', { state: { filterClientId: id } });
                }}
              >
                <TrendingUp className="h-4 w-4" />
                Ver Todas as Ordens
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Ordens */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ordens de Serviço</CardTitle>
            <CardDescription>
              {orders.length} {orders.length === 1 ? 'ordem registrada' : 'ordens registradas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma ordem de serviço registrada</p>
                <Button
                  onClick={() => navigate('/admin/orders/new', { state: { clientId: id, clientName: client.name } })}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Criar Primeira Ordem
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">OS #{order.order_number}</p>
                        <OrderStatusBadge status={order.status} />
                        {order.em_garantia && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Em Garantia
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{order.equipment}</p>
                      <p className="text-sm text-muted-foreground truncate">{order.problem_description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium">
                        {order.total_cost ? formatCurrency(Number(order.total_cost)) : 'Aguardando orçamento'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
