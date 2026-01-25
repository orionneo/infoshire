import { ArrowLeft, LayoutDashboard, Menu as MenuIcon } from 'lucide-react';
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
import { DollarSign, Package, Shield, Users } from 'lucide-react';

interface MobileNavBarProps {
  title: string;
  showBackButton?: boolean;
  backTo?: string;
}

export function MobileNavBar({ title, showBackButton = true, backTo = '/admin' }: MobileNavBarProps) {
  const navigate = useNavigate();

  const quickLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
    { label: 'Ordens de Serviço', icon: Package, to: '/admin/orders' },
    { label: 'Clientes', icon: Users, to: '/admin/clients' },
    { label: 'Financeiro', icon: DollarSign, to: '/admin/financial' },
    { label: 'Garantias', icon: Shield, to: '/admin/warranty-list' },
  ];

  return (
    <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backTo)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Acesso Rápido</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenuItem
                key={link.to}
                onClick={() => navigate(link.to)}
                className="cursor-pointer"
              >
                <Icon className="h-4 w-4 mr-2" />
                {link.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
