import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClientLayout } from '@/components/layouts/ClientLayout';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getClientServiceOrders } from '@/db/api';
import type { ServiceOrder } from '@/types/types';

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Trata o callback do OAuth e limpa a URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('code') || params.get('access_token')) {
      const timer = setTimeout(() => {
        navigate('/client', { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const data = await getClientServiceOrders(user.id);
      setOrders(data);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Minhas Ordens de Serviço</h1>
            <p className="text-muted-foreground">Acompanhe o status dos seus reparos</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Voltar ao site principal
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma ordem de serviço</p>
              <p className="text-sm text-muted-foreground text-center">
                Você ainda não possui ordens de serviço cadastradas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/client/orders/${order.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">OS #{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{order.equipment}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Problema: </span>
                      <span>{order.problem_description}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criado em: </span>
                      <span>{format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    {order.estimated_completion && (
                      <div>
                        <span className="text-muted-foreground">Previsão: </span>
                        <span>{format(new Date(order.estimated_completion), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/client/orders/${order.id}`);
                  }}>
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
