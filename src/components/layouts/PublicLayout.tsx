import { Briefcase, Facebook, Home, Info, Instagram, LogIn, Mail, MessageCircle, Shield, Wrench, Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BudgetWhatsAppModal } from '@/components/BudgetWhatsAppModal';
import { InstallPWA } from '@/components/common/InstallPWA';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getSearchEnabled } from '@/db/api';
import logoInfoshire from '@/assets/images/logo-infoshire.png';
import logoWhite from '@/assets/images/logo-white.png';
import logoIcon from '@/assets/images/logo-icon.png';
import logoDark from '@/assets/images/logo-dark.png';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchEnabled, setSearchEnabled] = useState(false);

  useEffect(() => {
    // Carregar configuração de busca
    getSearchEnabled().then(setSearchEnabled).catch(() => setSearchEnabled(false));
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/services', label: 'Serviços', icon: Briefcase },
    { to: '/about', label: 'Sobre', icon: Info },
    { to: '/contact', label: 'Contato', icon: Mail },
  ];

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: 'https://wa.me/5519993352727?text=Olá,%20estou%20vindo%20do%20site',
      color: 'hover:text-[#25D366]',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      url: 'https://www.instagram.com/infoshiregames',
      color: 'hover:text-[#E4405F]',
    },
    {
      name: 'YouTube',
      icon: Youtube,
      url: 'https://www.youtube.com/channel/UCG1UERvmow2jeAAKSfyg3JQ',
      color: 'hover:text-[#FF0000]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: 'https://web.facebook.com/Infoshiree',
      color: 'hover:text-[#1877F2]',
    },
  ];

  const whatsappUrl = 'https://wa.me/5519993352727?text=Olá,%20quero%20um%20orçamento%20rápido';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Content Wrapper - Garante que todo conteúdo fique acima do background */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Install PWA Banner */}
        <InstallPWA />
        
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {/* Logo Image */}
            <div className="h-12 w-12 flex items-center justify-center">
              <img
                src={logoInfoshire}
                alt="InfoShire Logo"
                className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(139,255,0,0.8)]"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="outline"
                size="sm"
                className="neon-hover"
                onClick={() => navigate(link.to)}
              >
                {link.label}
              </Button>
            ))}
            {/* Admin Access Button - Always Visible */}
            <Button
              variant="outline"
              size="sm"
              className="neon-hover"
              onClick={() => navigate('/admin')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Painel Admin
            </Button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {/* Search Bar - Conditional */}
            {searchEnabled && <SearchBar />}
            
            {/* Action Buttons Premium - WhatsApp e Acompanhar OS */}
            <Button
              size="sm"
              className="btn-premium rounded-full h-10 px-6 bg-gradient-to-r from-primary to-primary/90 text-black font-semibold"
              onClick={() => window.open('https://wa.me/5519997744247?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento.', '_blank')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="neon-hover"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="neon-hover"
                  onClick={() => navigate(profile?.role === 'admin' ? '/admin' : '/client')}
                >
                  {profile?.role === 'admin' ? 'Painel' : 'Minhas Ordens'}
                </Button>
                <Button variant="outline" size="sm" className="neon-hover" onClick={handleSignOut}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="neon-hover" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button variant="outline" size="sm" className="neon-hover" onClick={() => navigate('/register')}>
                  Cadastrar
                </Button>
              </>
            )}
          </div>

          {/* Mobile Navigation - Icon Buttons */}
          <nav className="flex lg:hidden items-center gap-1">
            {/* Search Bar - Mobile - Conditional */}
            {searchEnabled && (
              <div className="mr-1">
                <SearchBar />
              </div>
            )}
            
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.to}
                  variant="ghost"
                  size="icon"
                  className="neon-hover h-9 w-9"
                  onClick={() => navigate(link.to)}
                  title={link.label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              );
            })}
            {user ? (
              <>
                {/* User Panel/Orders Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="neon-hover h-9 w-9"
                  onClick={() => navigate(profile?.role === 'admin' ? '/admin' : '/client')}
                  title={profile?.role === 'admin' ? 'Meu Painel' : 'Minhas Ordens'}
                >
                  <Shield className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                {/* Admin Access Button - Always visible when not logged in */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="neon-hover h-9 w-9"
                  onClick={() => navigate('/admin')}
                  title="Painel Admin"
                >
                  <Shield className="h-5 w-5" />
                </Button>
                {/* Login Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="neon-hover h-9 w-9"
                  onClick={() => navigate('/login')}
                  title="Entrar"
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-primary/20 bg-black/90 backdrop-blur-md">
        <div className="container px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-14 bg-primary text-black hover:bg-primary/90 font-semibold"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </Button>
            <BudgetWhatsAppModal
              trigger={(
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 border-primary/60 text-primary hover:bg-primary/10 hover:border-primary font-semibold"
                >
                  Pedir Orçamento
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <div className="xl:hidden h-[88px]" />
      {/* Main Content */}
      <main className="flex-1">{children}</main>
      {/* Footer */}
      <footer className="border-t border-border bg-card/95 backdrop-blur-sm pb-24 xl:pb-8">
        <div className="container py-6 xl:py-8 px-4 text-foreground">
          {/* Mobile Compact Layout (< xl) */}
          <div className="xl:hidden space-y-6">
            {/* Brand Section */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 font-bold text-lg mb-2">
                <Wrench className="h-5 w-5 text-primary" />
                <span>InfoShire</span>
              </div>
              <p className="text-xs text-muted-foreground/90">
                Assistência técnica especializada em eletrônicos, computadores e videogames.
              </p>
              {/* Social Media Icons */}
              <div className="flex gap-2 justify-center mt-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-all duration-300 hover:bg-primary/20 hover:scale-110 ${social.color}`}
                      aria-label={social.name}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Two Column Layout for Links and Contact */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Left Column: Quick Links */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wide">Links</h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground/90">
                  {navLinks.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right Column: Contact Info */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wide">Contato</h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground/90">
                  <li className="hover:text-primary transition-colors">
                    <a href="tel:+5519993352727">(19) 99335-2727</a>
                  </li>
                  <li className="hover:text-primary transition-colors break-all">
                    <a href="mailto:zanonthiago@hotmail.com">zanonthiago@hotmail.com</a>
                  </li>
                  <li className="text-xs">Campinas – SP</li>
                </ul>
              </div>
            </div>

            {/* Map Navigation Buttons */}
            <div className="flex gap-2">
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Infoshire+Games+e+Informática,+Rua+Expedicionário+Hélio+Alves+de+Camargo,+614,+Jd.+Quarto+Centenário,+Campinas+-+SP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-xs font-medium"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Google Maps
              </a>
              <a
                href="https://waze.com/ul?q=Infoshire+Games+e+Informática,+Rua+Expedicionário+Hélio+Alves+de+Camargo,+614,+Jd.+Quarto+Centenário,+Campinas+-+SP"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-xs font-medium"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Waze
              </a>
            </div>

            {/* Payment Methods - Compact */}
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Formas de Pagamento</p>
              <div className="flex items-center gap-2 flex-wrap justify-center mb-3">
                {/* Visa */}
                <div className="bg-gradient-to-br from-card to-card/50 px-3 py-2 rounded-lg border border-border">
                  <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="url(#visaGradient)"/>
                    <defs>
                      <linearGradient id="visaGradient" x1="0" y1="0" x2="48" y2="32">
                        <stop offset="0%" stopColor="#1A1F71"/>
                        <stop offset="100%" stopColor="#0D1238"/>
                      </linearGradient>
                    </defs>
                    <text x="24" y="21" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">VISA</text>
                  </svg>
                </div>
                
                {/* Mastercard */}
                <div className="bg-gradient-to-br from-card to-card/50 px-3 py-2 rounded-lg border border-border">
                  <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#000"/>
                    <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                    <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                    <path d="M24 11.5C22.5 12.8 21.5 14.3 21.5 16C21.5 17.7 22.5 19.2 24 20.5C25.5 19.2 26.5 17.7 26.5 16C26.5 14.3 25.5 12.8 24 11.5Z" fill="#FF5F00"/>
                  </svg>
                </div>
                
                {/* Elo */}
                <div className="bg-gradient-to-br from-card to-card/50 px-3 py-2 rounded-lg border border-border">
                  <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#000"/>
                    <circle cx="16" cy="16" r="6" fill="#FFCB05"/>
                    <circle cx="32" cy="16" r="6" fill="#00A4E0"/>
                    <path d="M24 12C22.3 13 21 14.4 21 16C21 17.6 22.3 19 24 20C25.7 19 27 17.6 27 16C27 14.4 25.7 13 24 12Z" fill="#EE4023"/>
                  </svg>
                </div>
                
                {/* American Express */}
                <div className="bg-gradient-to-br from-card to-card/50 px-3 py-2 rounded-lg border border-border">
                  <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="url(#amexGradient)"/>
                    <defs>
                      <linearGradient id="amexGradient" x1="0" y1="0" x2="48" y2="32">
                        <stop offset="0%" stopColor="#006FCF"/>
                        <stop offset="100%" stopColor="#004A8F"/>
                      </linearGradient>
                    </defs>
                    <text x="24" y="21" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">AMEX</text>
                  </svg>
                </div>
                
                {/* Pix */}
                <div className="bg-gradient-to-br from-card to-card/50 px-3 py-2 rounded-lg border border-border">
                  <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                    <rect width="48" height="32" rx="4" fill="#32BCAD"/>
                    <path d="M16 12L20 16L16 20L12 16L16 12Z" fill="white"/>
                    <path d="M24 12L28 16L24 20L20 16L24 12Z" fill="white"/>
                    <path d="M32 12L36 16L32 20L28 16L32 12Z" fill="white"/>
                  </svg>
                </div>
              </div>
              
              {/* Installment Badge */}
              <div className="inline-flex bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-2 rounded-lg border-2 border-primary/40">
                <span className="text-xs font-bold text-primary flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Parcele em até 12x
                </span>
              </div>
            </div>

            {/* Partnership & Characters - Compact */}
            <div className="flex items-center justify-between px-2">
              {/* Mario */}
              <img
                src={logoWhite}
                alt="Mario"
                className="h-16 w-auto object-contain"
              />
              
              {/* Global Electronics - Center */}
              <a 
                href="https://www.globalelectronics.com.br/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1"
              >
                <p className="text-[10px] font-semibold text-muted-foreground/90">Parceiro Oficial</p>
                <img 
                  src={logoIcon}
                  alt="Global Electronics"
                  className="h-6 w-auto object-contain"
                />
              </a>
              
              {/* Astrobot */}
              <img
                src={logoDark}
                alt="Astrobot"
                className="h-16 w-auto object-contain"
              />
            </div>

            {/* Copyright */}
            <div className="text-center text-[10px] text-muted-foreground/90 pt-2 border-t border-border">
              © 2026 InfoShire. Todos os direitos reservados.
            </div>
          </div>

          {/* Desktop Layout (xl+) - Keep existing */}
          <div className="hidden xl:block">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-4">
                <Wrench className="h-5 w-5 text-primary" />
                <span>InfoShire</span>
              </div>
              <p className="text-sm text-muted-foreground/90 mb-4">
                Assistência técnica especializada em eletrônicos, computadores e videogames.
              </p>
              {/* Social Media Icons */}
              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-all duration-300 hover:bg-primary/20 hover:scale-110 ${social.color}`}
                      aria-label={social.name}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Links Rápidos</h3>
              <ul className="space-y-2 text-sm text-muted-foreground/90">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Contato</h3>
              <ul className="space-y-2 text-sm text-muted-foreground/90">
                <li className="hover:text-primary transition-colors">
                  <a href="tel:+5519993352727">(19) 99335-2727</a>
                </li>
                <li className="hover:text-primary transition-colors">
                  <a href="mailto:zanonthiago@hotmail.com">zanonthiago@hotmail.com</a>
                </li>
                <li>Rua Expedicionário Hélio Alves de Camargo, 614</li>
                <li>Jd. Quarto Centenário, Campinas – SP</li>
              </ul>
              
              {/* Mini Map Navigation */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Como Chegar:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Infoshire+Games+e+Informática,+Rua+Expedicionário+Hélio+Alves+de+Camargo,+614,+Jd.+Quarto+Centenário,+Campinas+-+SP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-xs font-medium hover:scale-105"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Google Maps
                  </a>
                  <a
                    href="https://waze.com/ul?q=Infoshire+Games+e+Informática,+Rua+Expedicionário+Hélio+Alves+de+Camargo,+614,+Jd.+Quarto+Centenário,+Campinas+-+SP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-xs font-medium hover:scale-105"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    Waze
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Redes Sociais</h3>
              <ul className="space-y-2 text-sm text-muted-foreground/90">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {social.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8">
            {/* Payment Methods & Partnership */}
            <div className="flex flex-col items-center gap-8 mb-6">
              {/* Payment Methods */}
              <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Formas de Pagamento</p>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                  {/* Visa */}
                  <div className="group relative bg-gradient-to-br from-card to-card/50 hover:from-primary/10 hover:to-primary/5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/20">
                    <svg className="h-6 w-10 sm:h-8 sm:w-12" viewBox="0 0 48 32" fill="none">
                      <rect width="48" height="32" rx="4" fill="url(#visaGradient)"/>
                      <defs>
                        <linearGradient id="visaGradient" x1="0" y1="0" x2="48" y2="32">
                          <stop offset="0%" stopColor="#1A1F71"/>
                          <stop offset="100%" stopColor="#0D1238"/>
                        </linearGradient>
                      </defs>
                      <text x="24" y="21" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">VISA</text>
                    </svg>
                  </div>
                  
                  {/* Mastercard */}
                  <div className="group relative bg-gradient-to-br from-card to-card/50 hover:from-primary/10 hover:to-primary/5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/20">
                    <svg className="h-6 w-10 sm:h-8 sm:w-12" viewBox="0 0 48 32" fill="none">
                      <rect width="48" height="32" rx="4" fill="#000"/>
                      <circle cx="18" cy="16" r="7" fill="#EB001B"/>
                      <circle cx="30" cy="16" r="7" fill="#F79E1B"/>
                      <path d="M24 11.5C22.5 12.8 21.5 14.3 21.5 16C21.5 17.7 22.5 19.2 24 20.5C25.5 19.2 26.5 17.7 26.5 16C26.5 14.3 25.5 12.8 24 11.5Z" fill="#FF5F00"/>
                    </svg>
                  </div>
                  
                  {/* Elo */}
                  <div className="group relative bg-gradient-to-br from-card to-card/50 hover:from-primary/10 hover:to-primary/5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/20">
                    <svg className="h-6 w-10 sm:h-8 sm:w-12" viewBox="0 0 48 32" fill="none">
                      <rect width="48" height="32" rx="4" fill="#000"/>
                      <circle cx="16" cy="16" r="6" fill="#FFCB05"/>
                      <circle cx="32" cy="16" r="6" fill="#00A4E0"/>
                      <path d="M24 12C22.3 13 21 14.4 21 16C21 17.6 22.3 19 24 20C25.7 19 27 17.6 27 16C27 14.4 25.7 13 24 12Z" fill="#EE4023"/>
                    </svg>
                  </div>
                  
                  {/* American Express */}
                  <div className="group relative bg-gradient-to-br from-card to-card/50 hover:from-primary/10 hover:to-primary/5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/20">
                    <svg className="h-6 w-10 sm:h-8 sm:w-12" viewBox="0 0 48 32" fill="none">
                      <rect width="48" height="32" rx="4" fill="url(#amexGradient)"/>
                      <defs>
                        <linearGradient id="amexGradient" x1="0" y1="0" x2="48" y2="32">
                          <stop offset="0%" stopColor="#006FCF"/>
                          <stop offset="100%" stopColor="#004A8F"/>
                        </linearGradient>
                      </defs>
                      <text x="24" y="21" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">AMEX</text>
                    </svg>
                  </div>
                  
                  {/* Pix */}
                  <div className="group relative bg-gradient-to-br from-card to-card/50 hover:from-primary/10 hover:to-primary/5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/20">
                    <svg className="h-6 w-10 sm:h-8 sm:w-12" viewBox="0 0 48 32" fill="none">
                      <rect width="48" height="32" rx="4" fill="#32BCAD"/>
                      <path d="M16 12L20 16L16 20L12 16L16 12Z" fill="white"/>
                      <path d="M24 12L28 16L24 20L20 16L24 12Z" fill="white"/>
                      <path d="M32 12L36 16L32 20L28 16L32 12Z" fill="white"/>
                    </svg>
                  </div>
                </div>
                
                {/* Installment Badge - Full Width on Mobile */}
                <div className="w-full max-w-xs bg-gradient-to-r from-primary/20 to-primary/10 px-4 sm:px-6 py-3 rounded-lg border-2 border-primary/40 hover:border-primary transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-primary/30">
                  <span className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Parcele em até 12x
                  </span>
                </div>
              </div>
              
              {/* Global Electronics Partnership */}
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-sm font-semibold text-muted-foreground/90">Parceiro Oficial</p>
                <a 
                  href="https://www.globalelectronics.com.br/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-black px-6 py-3 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 hover:scale-105 group"
                >
                  <img 
                    src={logoIcon}
                    alt="Global Electronics - Distribuidor Autorizado"
                    className="h-8 sm:h-10 w-auto object-contain"
                  />
                  <div className="text-left border-l border-primary/30 pl-3">
                    <p className="text-xs font-bold text-primary group-hover:text-primary/80 transition-colors">Distribuidor</p>
                    <p className="text-xs text-muted-foreground/90">Autorizado</p>
                  </div>
                </a>
              </div>
            </div>
            
            {/* Gaming Characters - Mario & Astrobot */}
            <div className="relative mt-6 flex items-center justify-center sm:justify-between max-w-4xl mx-auto px-4">
              {/* Mario - Left Side */}
              <div className="relative group hidden sm:block">
                <img
                  src={logoWhite}
                  alt="Mario"
                  className="h-20 sm:h-24 md:h-32 w-auto object-contain transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(0,255,0,0.6)]"
                />
              </div>
              
              {/* Copyright - Center */}
              <div className="text-center text-xs sm:text-sm text-muted-foreground/90 flex-1 px-2 sm:px-4 self-center">
                © 2026 InfoShire. Todos os direitos reservados.
              </div>
              
              {/* Astrobot - Right Side */}
              <div className="relative group hidden sm:block">
                <img
                  src={logoDark}
                  alt="Astrobot"
                  className="h-20 sm:h-24 md:h-32 w-auto object-contain transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(0,255,0,0.6)]"
                />
              </div>
            </div>
           </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
