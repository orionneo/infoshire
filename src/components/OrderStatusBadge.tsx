import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/types';

// Sistema de cores inteligente para cada status
// Cores escolhidas para facilitar identificação visual rápida
const statusConfig: Record<OrderStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  received: { 
    label: 'Recebido', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '📥'
  },
  analyzing: { 
    label: 'Em Análise', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: '🔍'
  },
  awaiting_approval: { 
    label: 'Aguardando Aprovação', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: '💰'
  },
  approved: { 
    label: 'Aprovado', 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: '✅'
  },
  not_approved: { 
    label: 'Não Aprovado - Cancelado', 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: '❌'
  },
  in_repair: { 
    label: 'Em Reparo', 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: '🔧'
  },
  awaiting_parts: { 
    label: 'Aguardando Peças', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '📦'
  },
  ready_for_pickup: { 
    label: 'Pronto para Retirada', 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    icon: '🎉'
  },
  completed: { 
    label: 'Finalizado', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: '✔️'
  },
};

export function OrderStatusBadge({ status, showIcon = false }: { status: OrderStatus; showIcon?: boolean }) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      className={`whitespace-nowrap border ${config.color} ${config.bgColor} ${config.borderColor}`}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}

export function getStatusLabel(status: OrderStatus): string {
  return statusConfig[status].label;
}

export function getStatusConfig(status: OrderStatus) {
  return statusConfig[status];
}

export const allStatuses: { value: OrderStatus; label: string }[] = [
  { value: 'received', label: 'Recebido' },
  { value: 'analyzing', label: 'Em Análise' },
  { value: 'awaiting_approval', label: 'Aguardando Aprovação' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'not_approved', label: 'Não Aprovado - Cancelado' },
  { value: 'in_repair', label: 'Em Reparo' },
  { value: 'awaiting_parts', label: 'Aguardando Peças' },
  { value: 'ready_for_pickup', label: 'Pronto para Retirada' },
  { value: 'completed', label: 'Finalizado' },
];

// Exportar configuração de cores para uso em filtros
export { statusConfig };
