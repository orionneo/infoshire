import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, AlertTriangle, Bell, CheckCircle2, Clock, Info, Loader2, Package, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinancialSummary } from '@/components/FinancialSummary';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAllServiceOrders, getDashboardStats, getFinancialStats, getWarrantiesExpiringSoon, getDashboardAlerts } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ServiceOrderWithClient } from '@/types/types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [financialStats, setFinancialStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<ServiceOrderWithClient[]>([]);
  const [warrantiesExpiring, setWarrantiesExpiring] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar alertas dispensados do localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedAlerts');
    if (dismissed) {
      setDismissedAlerts(JSON.parse(dismissed));
    }
  }, []);

  // Dispensar alerta
  const dismissAlert = (alertId: string) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
  };

  // Filtrar alertas dispensados
  const visibleAlerts = alerts.filter(alert => 
    !dismissedAlerts.includes(alert.id) || !alert.dismissible
  );

  // Obter saudação baseada no horário (GMT-3)
  const getGreeting = () => {
    const now = new Date();
    // Converter para GMT-3 (horário de Brasília)
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = brasiliaTime.getHours();
    
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Obter data e hora formatada (GMT-3)
  const getCurrentDateTime = () => {
    const now = new Date();
    return format(new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Obter ícone para cada tipo de alerta
  const getAlertIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      clock: Clock,
      alert: AlertCircle,
      package: Package,
      shield: Shield,
      bell: Bell,
    };
    return icons[iconName] || AlertCircle;
  };

  // Obter classes de cor para cada tipo de alerta
  const getAlertColorClasses = (color: string, type: string) => {
    const colors: Record<string, any> = {
      red: {
        bg: 'bg-red-950/30 dark:bg-red-950/40',
        border: 'border-red-800/50 dark:border-red-700/50',
        text: 'text-red-200 dark:text-red-100',
        icon: 'text-red-400',
        badge: 'bg-red-900/70 text-red-200',
        button: 'bg-red-600 hover:bg-red-700 text-white',
      },
      orange: {
        bg: 'bg-orange-950/30 dark:bg-orange-950/40',
        border: 'border-orange-800/50 dark:border-orange-700/50',
        text: 'text-orange-200 dark:text-orange-100',
        icon: 'text-orange-400',
        badge: 'bg-orange-900/70 text-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700 text-white',
      },
      blue: {
        bg: 'bg-blue-950/30 dark:bg-blue-950/40',
        border: 'border-blue-800/50 dark:border-blue-700/50',
        text: 'text-blue-200 dark:text-blue-100',
        icon: 'text-blue-400',
        badge: 'bg-blue-900/70 text-blue-200',
        button: 'bg-blue-600 hover:bg-blue-700 text-white',
      },
      yellow: {
        bg: 'bg-yellow-950/30 dark:bg-yellow-950/40',
        border: 'border-yellow-800/50 dark:border-yellow-700/50',
        text: 'text-yellow-200 dark:text-yellow-100',
        icon: 'text-yellow-400',
        badge: 'bg-yellow-900/70 text-yellow-200',
        button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      },
    };
    return colors[color] || colors.blue;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, ordersData, financialData, warrantiesData, alertsData] = await Promise.all([
        getDashboardStats(),
        getAllServiceOrders(),
        getFinancialStats(),
        getWarrantiesExpiringSoon(),
        getDashboardAlerts(),
      ]);
      
      setStats(statsData);
      setRecentOrders(ordersData.slice(0, 5));
      setFinancialStats(financialData);
      setWarrantiesExpiring(warrantiesData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
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

  const statCards = [
    {
      title: 'Total de Ordens',
      value: stats?.total || 0,
      icon: Package,
      color: 'text-primary',
      link: '/admin/orders',
      filter: null,
    },
    {
      title: 'Em Andamento',
      value: (stats?.analyzing || 0) + (stats?.in_repair || 0) + (stats?.awaiting_parts || 0),
      icon: Clock,
      color: 'text-warning',
      link: '/admin/orders',
      filter: 'in_progress',
    },
    {
      title: 'Aguardando Aprovação',
      value: stats?.awaiting_approval || 0,
      icon: AlertCircle,
      color: 'text-info',
      link: '/admin/orders',
      filter: 'awaiting_approval',
    },
    {
      title: 'Concluídas',
      value: (stats?.completed || 0) + (stats?.ready_for_pickup || 0),
      icon: CheckCircle2,
      color: 'text-success',
      link: '/admin/orders',
      filter: 'completed',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Saudação com Alertas */}
        <div className="bg-card border rounded-lg p-4 xl:p-6 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold mb-1">
                {getGreeting()}, {profile?.name?.split(' ')[0] || 'Administrador'}! 👋
              </h1>
              <p className="text-sm text-muted-foreground capitalize">
                {getCurrentDateTime()}
              </p>
            </div>
            {visibleAlerts.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Bell className="h-3 w-3" />
                {visibleAlerts.length} {visibleAlerts.length === 1 ? 'alerta' : 'alertas'}
              </Badge>
            )}
          </div>

          {/* Alertas e Notificações */}
          {visibleAlerts.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Pendências que Precisam de Atenção</h3>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {visibleAlerts.slice(0, 6).map((alert) => {
                    const Icon = getAlertIcon(alert.icon);
                    const colorClasses = getAlertColorClasses(alert.color, alert.type);
                    
                    // Get first order if available for direct navigation
                    const firstOrder = alert.orders && alert.orders.length > 0 ? alert.orders[0] : null;
                    const hasSpecificOrder = firstOrder && firstOrder.id;
                    
                    return (
                      <div
                        key={alert.id}
                        className={`relative p-3 rounded-lg border ${colorClasses.bg} ${colorClasses.border} hover:shadow-md transition-all`}
                      >
                        {/* Botão de dispensar (apenas para alertas dispensáveis) */}
                        {alert.dismissible && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissAlert(alert.id);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors"
                            title="Dispensar alerta"
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        )}
                        
                        <div className="flex items-start justify-between mb-2 pr-6">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colorClasses.icon}`} />
                            <h4 className={`font-semibold text-sm ${colorClasses.text}`}>
                              {alert.title}
                            </h4>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {alert.count}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {alert.description}
                        </p>
                        
                        {/* Show first order info if available */}
                        {hasSpecificOrder && (
                          <div 
                            className="text-xs text-muted-foreground mb-2 p-2 bg-background/50 rounded border cursor-pointer hover:bg-background/70 transition-colors"
                            onClick={() => navigate(`/admin/orders/${firstOrder.id}`)}
                          >
                            <p className="font-medium">OS #{firstOrder.order_number}</p>
                            <p className="truncate">{firstOrder.client?.name || 'Cliente'} - {firstOrder.equipment}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {hasSpecificOrder && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/orders/${firstOrder.id}`);
                              }}
                            >
                              Ver OS
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={hasSpecificOrder ? "outline" : "default"}
                            className={`${hasSpecificOrder ? 'flex-1' : 'w-full'} text-xs`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(alert.link);
                            }}
                          >
                            {hasSpecificOrder ? `Ver Todas (${alert.count})` : alert.action}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {alerts.length > 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate('/admin/orders')}
                  >
                    Ver Todos os Alertas ({alerts.length})
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Mensagem quando não há alertas */}
          {alerts.length === 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Tudo em ordem! Nenhuma pendência urgente no momento.</span>
              </div>
            </>
          )}
        </div>

        {/* Cards de Estatísticas - Clicáveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const handleClick = () => {
              if (stat.filter) {
                navigate(`${stat.link}?status=${stat.filter}`);
              } else {
                navigate(stat.link);
              }
            };
            
            return (
              <Card 
                key={stat.title} 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={handleClick}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Financial Summary */}
        {financialStats && (
          <FinancialSummary
            totalRevenue={financialStats.totalRevenue}
            laborRevenue={financialStats.laborRevenue}
            partsRevenue={financialStats.partsRevenue}
            approvedOrdersCount={financialStats.approvedOrdersCount}
            month={financialStats.month}
            year={financialStats.year}
          />
        )}

        {/* Garantias Expirando */}
        {warrantiesExpiring.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-orange-900 dark:text-orange-100">
                    Garantias Expirando em Breve
                  </CardTitle>
                </div>
                <span className="text-sm font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded-full">
                  {warrantiesExpiring.length} {warrantiesExpiring.length === 1 ? 'ordem' : 'ordens'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {warrantiesExpiring.slice(0, 3).map((order: any) => {
                  const daysRemaining = Math.ceil(
                    (new Date(order.data_fim_garantia).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-lg hover:shadow-md cursor-pointer transition-all"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">OS #{order.order_number}</p>
                          <span className="text-xs text-orange-600 font-medium">
                            {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.equipment}</p>
                        <p className="text-xs text-muted-foreground">
                          Cliente: {order.client?.name || order.client?.email}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Expira em</p>
                        <p className="font-medium text-orange-600">
                          {format(new Date(order.data_fim_garantia), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {warrantiesExpiring.length > 3 && (
                  <button
                    onClick={() => navigate('/admin/warranty-list')}
                    className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium py-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                  >
                    Ver todas as {warrantiesExpiring.length} garantias expirando
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ordens Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma ordem de serviço cadastrada
              </p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">OS #{order.order_number}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{order.equipment}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {order.client.name || order.client.email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
