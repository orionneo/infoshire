import { BarChart3, Brain, CalendarClock, DollarSign, Home, LayoutDashboard, LogOut, Mail, Megaphone, Menu, MessageSquare, Package, Settings, SettingsIcon, Shield, UserCog, Users, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApprovalNotifications } from '@/components/ApprovalNotifications';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/orders', label: 'Ordens de Serviço', icon: Package },
    { to: '/admin/appointments', label: 'Agendamentos', icon: CalendarClock },
    { to: '/admin/clients', label: 'Clientes', icon: Users },
    { to: '/admin/financial', label: 'Financeiro', icon: DollarSign },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/ai-knowledge', label: 'Base de Conhecimento', icon: Brain },
    { to: '/admin/warranty-search', label: 'Buscar Garantia', icon: Shield },
    { to: '/admin/warranty-list', label: 'Garantias Ativas', icon: Shield },
    { to: '/admin/users', label: 'Usuários', icon: UserCog },
    { to: '/admin/email-marketing', label: 'Email Marketing', icon: Mail },
    { to: '/admin/email-settings', label: 'Config. Email', icon: SettingsIcon },
    { to: '/admin/whatsapp-settings', label: 'Config. WhatsApp', icon: MessageSquare },
    { to: '/admin/popup', label: 'Popup Promocional', icon: Megaphone },
    { to: '/admin/settings', label: 'Configurações', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Função para fechar menu mobile ao navegar
  const handleMobileNavigation = (to: string) => {
    navigate(to);
    setMobileMenuOpen(false);
  };

  // Obter título da página atual
  const getCurrentPageTitle = () => {
    const currentItem = navItems.find(item => item.to === location.pathname);
    return currentItem?.label || 'Dashboard';
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <div className="flex items-center gap-2 px-4 py-6 border-b">
        <Wrench className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl">InfoShire Admin</span>
      </div>

      <div className="flex-1 py-6">
        <nav className="space-y-2 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const linkContent = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{item.label}</span>
              </div>
            );

            return isMobile ? (
              <button
                key={item.to}
                onClick={() => handleMobileNavigation(item.to)}
                className="w-full text-left"
              >
                {linkContent}
              </button>
            ) : (
              <Link key={item.to} to={item.to}>
                {linkContent}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="mb-4 px-3">
          <p className="text-sm font-medium">{profile?.name || 'Administrador'}</p>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
        </div>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => isMobile ? handleMobileNavigation('/') : navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Site
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-card shrink-0 relative z-10">
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Desktop Header */}
        <header className="hidden lg:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-end px-6">
            <ApprovalNotifications />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <SidebarContent isMobile={true} />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="h-5 w-5 text-primary shrink-0" />
                <span className="font-semibold text-base truncate">{getCurrentPageTitle()}</span>
              </div>
            </div>
            <ApprovalNotifications />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 xl:p-6 pb-24 lg:pb-6">{children}</main>

        {/* Floating Action Button - Mobile Only */}
        <FloatingActionButton />
      </div>
    </div>
  );
}
