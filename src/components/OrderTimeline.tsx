import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, User, DollarSign } from 'lucide-react';
import type { OrderStatusHistoryWithUser, ApprovalHistory, OrderStatus } from '@/types/types';
import { getStatusLabel } from './OrderStatusBadge';

interface TimelineItem {
  id: string;
  type: 'status' | 'approval';
  date: Date;
  status?: OrderStatus;
  notes?: string | null;
  creator?: any;
  approval?: ApprovalHistory;
}

interface OrderTimelineProps {
  history: OrderStatusHistoryWithUser[];
  approvalHistory?: ApprovalHistory[];
}

export function OrderTimeline({ history, approvalHistory = [] }: OrderTimelineProps) {
  // Mesclar histórico de status e aprovações em uma única timeline
  const mergedTimeline: TimelineItem[] = [
    ...history.map(item => ({
      id: item.id,
      type: 'status' as const,
      date: new Date(item.created_at),
      status: item.status,
      notes: item.notes,
      creator: item.creator,
    })),
    ...approvalHistory.map(item => ({
      id: item.id,
      type: 'approval' as const,
      date: new Date(item.approved_at),
      approval: item,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {mergedTimeline.map((item, index) => {
        const isLast = index === mergedTimeline.length - 1;
        
        return (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1 ${isLast ? 'bg-primary' : item.type === 'approval' ? 'bg-green-500' : 'bg-muted'}`}>
                {item.type === 'approval' ? (
                  <DollarSign className={`h-5 w-5 ${isLast ? 'text-primary-foreground' : 'text-white'}`} />
                ) : (
                  <CheckCircle2 className={`h-5 w-5 ${isLast ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                )}
              </div>
              {index < mergedTimeline.length - 1 && (
                <div className="w-0.5 h-full min-h-[40px] bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {item.type === 'status' ? (
                    <>
                      <p className="font-medium">{getStatusLabel(item.status!)}</p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        📅 {format(item.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {item.creator && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{item.creator.name || item.creator.email}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-green-600 dark:text-green-400">💰 Orçamento Aprovado pelo Cliente</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          <span className="font-medium">Mão de obra:</span> {formatCurrency(item.approval?.labor_cost)}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium">Peças:</span> {formatCurrency(item.approval?.parts_cost)}
                        </p>
                        <p className="text-muted-foreground font-semibold">
                          <span className="font-bold">Total:</span> {formatCurrency(item.approval?.total_cost)}
                        </p>
                      </div>
                      {item.approval?.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                          {item.approval.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        📅 {format(item.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">Cliente</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
