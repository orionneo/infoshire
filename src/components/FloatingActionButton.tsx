import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, LayoutDashboard, Package, Search, Shield, Users } from 'lucide-react';

export function FloatingActionButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const quickActions = [
    { label: 'Nova Ordem', icon: Package, to: '/admin/orders', action: 'new-order', color: 'text-blue-500' },
    { label: 'Buscar Garantia', icon: Search, to: '/admin/warranty-search', color: 'text-green-500' },
    { label: 'Dashboard', icon: LayoutDashboard, to: '/admin', color: 'text-purple-500' },
    { label: 'Clientes', icon: Users, to: '/admin/clients', color: 'text-orange-500' },
    { label: 'Financeiro', icon: DollarSign, to: '/admin/financial', color: 'text-emerald-500' },
    { label: 'Garantias', icon: Shield, to: '/admin/warranty-list', color: 'text-cyan-500' },
  ];

  const handleAction = (to: string, action?: string) => {
    navigate(to, { state: { openDialog: action === 'new-order' } });
    setOpen(false);
  };

  return (
    <div className="lg:hidden fixed bottom-6 right-6 z-40">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mb-2">
          <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.to}
                onClick={() => handleAction(action.to, action.action)}
                className="cursor-pointer py-3"
              >
                <Icon className={`h-5 w-5 mr-3 ${action.color}`} />
                <span className="font-medium">{action.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
