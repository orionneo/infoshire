import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/db/supabase';

interface ApprovalNotification {
  id: string;
  order_id: string;
  total_cost: number;
  approved_at: string;
  admin_viewed: boolean;
  order_number: string;
  equipment: string;
  client_name: string;
}

export function ApprovalNotifications() {
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time subscription for new approvals
    const channel = supabase
      .channel('approval_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_history',
        },
        (payload) => {
          console.log('Nova aprovação recebida:', payload);
          loadNotifications();
          
          // Show browser notification if permission granted (only if Notification API is available)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const approval = payload.new as any;
            new Notification('Orçamento Aprovado! 🎉', {
              body: `Novo orçamento aprovado no valor de R$ ${approval.total_cost?.toFixed(2).replace('.', ',')}`,
              icon: '/favicon.ico',
              tag: approval.id,
            });
          }
        }
      )
      .subscribe();

    // Request notification permission (only if Notification API is available)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select(`
          id,
          order_id,
          total_cost,
          approved_at,
          admin_viewed,
          service_orders!inner(
            order_number,
            equipment,
            profiles!inner(name)
          )
        `)
        .eq('admin_viewed', false)
        .order('approved_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedNotifications = data?.map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        total_cost: item.total_cost,
        approved_at: item.approved_at,
        admin_viewed: item.admin_viewed,
        order_number: item.service_orders.order_number,
        equipment: item.service_orders.equipment,
        client_name: item.service_orders.profiles.name,
      })) || [];

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n) => !n.admin_viewed).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const markAsViewed = async (notificationId: string) => {
    try {
      await supabase
        .from('approval_history')
        .update({ admin_viewed: true })
        .eq('id', notificationId);

      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar como visualizado:', error);
    }
  };

  const markAllAsViewed = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('approval_history')
        .update({ admin_viewed: true })
        .eq('admin_viewed', false);

      if (error) {
        console.error('Erro ao marcar todas como visualizadas:', error);
        throw error;
      }

      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar todas como visualizadas:', error);
    }
  };

  const handleNotificationClick = (notification: ApprovalNotification) => {
    markAsViewed(notification.id);
    navigate(`/admin/orders/${notification.order_id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => markAllAsViewed(e)}
              className="h-6 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm">Orçamento Aprovado</span>
                  </div>
                  {!notification.admin_viewed && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  OS #{notification.order_number} - {notification.equipment}
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  Cliente: {notification.client_name}
                </p>
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    R$ {notification.total_cost.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.approved_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
