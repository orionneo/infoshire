import { Activity, ChevronLeft, ChevronRight, ClipboardList, Clock, Gamepad2, Laptop, MessageSquare, Microscope, Monitor, Package, Shield, ShieldCheck, Truck, Wrench } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BudgetWhatsAppModal } from '@/components/BudgetWhatsAppModal';
import { LogoEdgeSparkles } from '@/components/LogoEdgeSparkles';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { PromotionalPopup } from '@/components/PromotionalPopup';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import logoInfoshire from '@/assets/images/logo-infoshire.png';
import serviceNotebooks from '@/assets/images/service-notebooks.jpg';
import serviceVideogames from '@/assets/images/service-videogames.jpg';
import serviceElectronics from '@/assets/images/service-electronics.jpg';

type ProcessStep = {
  title: string;
  description: React.ReactNode;
  icon: React.ElementType;
  highlight?: boolean;
};

type ReviewsSummary = {
  rating: number;
  totalReviews: number;
  cached?: boolean;
  cacheAgeHours?: number;
  cachedAt?: string | null;
};

export default function Home() {
  const navigate = useNavigate();
  const [googleSummary, setGoogleSummary] = useState<ReviewsSummary>({
    rating: 4.9,
    totalReviews: 600,
    cached: undefined,
    cacheAgeHours: undefined,
    cachedAt: null,
  });

  const formattedRating = Number.isFinite(googleSummary.rating)
    ? googleSummary.rating.toFixed(1)
    : '4.9';
  const formattedTotalReviews = `${new Intl.NumberFormat('pt-BR').format(
    Number.isFinite(googleSummary.totalReviews) ? googleSummary.totalReviews : 600,
  )}+`;

  // Features highlighting InfoShire's strengths
  const features = [
    {
      icon: Clock,
      title: 'Mais de 24 anos de experiência',
      description: 'Experiência consolidada em eletrônica e reparos de alta complexidade',
    },
    {
      icon: Wrench,
      title: 'Laboratório técnico equipado',
      description: 'Ferramentas e equipamentos profissionais para diagnósticos precisos',
    },
    {
      icon: Shield,
      title: 'Diagnóstico transparente',
      description: 'Comunicação clara sobre o problema e a solução proposta',
    },
    {
      icon: MessageSquare,
      title: 'Comunicação direta com o técnico',
      description: 'Converse diretamente com quem está cuidando do seu equipamento',
    },
    {
      icon: Clock,
      title: 'Acompanhamento em tempo real',
      description: 'Veja o status do seu reparo atualizado em tempo real',
    },
    {
      icon: Wrench,
      title: 'Especialistas em alta complexidade',
      description: 'Reparos avançados em eletrônicos, placas e componentes',
    },
  ];

  // Simple service categories for homepage (original design)
  const simpleServices = [
    {
      title: 'Notebooks, PCs e Macs',
      description: 'Diagnóstico completo, reparo avançado de periféricos, upgrades, modding e recuperação de dados',
      icon: Laptop,
      image: serviceNotebooks,
    },
    {
      title: 'Videogames',
      description: 'Reparo especializado para todas as plataformas: PlayStation, Xbox, Nintendo e consoles retro',
      icon: Gamepad2,
      image: serviceVideogames,
    },
    {
      title: 'Eletrônicos',
      description: 'Smart TVs, placas de vídeo, recuperação de placas eletrônicas e reballing profissional',
      icon: Monitor,
      image: serviceElectronics,
    },
  ];

  const processSteps: ProcessStep[] = [
    {
      title: 'Pedido de Orçamento',
      description: 'Cliente solicita orçamento pelo site ou WhatsApp.',
      icon: ClipboardList,
    },
    {
      title: 'Entrega ou Envio do Equipamento',
      description: 'Cliente leva o equipamento ou envia pelos Correios.',
      icon: Package,
    },
    {
      title: 'Análise Técnica Especializada',
      description: 'Avaliação profissional é realizada.',
      icon: Microscope,
    },
    {
      title: 'Orçamento Digital + Aprovação do Cliente',
      description: (
        <>
          O <strong>CLIENTE</strong> aprova o orçamento pelo sistema.
        </>
      ),
      icon: ShieldCheck,
      highlight: true,
    },
    {
      title: 'Acompanhamento em Tempo Real',
      description: 'Cliente acompanha cada etapa.',
      icon: Activity,
    },
    {
      title: 'Retirada ou Envio Final',
      description: 'Equipamento finalizado e entregue.',
      icon: Truck,
    },
  ];

  return (
    <PublicLayout>
      {/* Popup Promocional */}
      <PromotionalPopup />
      
      {/* Hero Section */}
      <section className="relative bg-transparent pb-20 pt-28 sm:pt-32 xl:pb-32 xl:pt-36 overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo InfoShire */}
            <div className="mb-12 flex justify-center animate-fade-in-up">
              <div className="w-full max-w-lg xl:max-w-3xl relative px-4">
                <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse"></div>
                <div className="relative">
                  {/* overlay premium mascarado pelo PNG (sem quadrado) */}
                  <div
                    className="logo-mask-overlay pointer-events-none absolute inset-0"
                    style={{
                      WebkitMaskImage: `url(${logoInfoshire})`,
                      maskImage: `url(${logoInfoshire})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    }}
                  >
                    {/* micro-grain ultra sutil */}
                    <div
                      className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.28), transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.16), transparent 45%), radial-gradient(circle at 30% 80%, rgba(255,255,255,0.12), transparent 52%)',
                      }}
                    />
                    {/* sheen */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="sheen-premium" />
                    </div>
                  </div>

                  <LogoEdgeSparkles
                    src={logoInfoshire}
                    alt="InfoShire - Games e Informática"
                    className="drop-shadow-[0_0_12px_rgba(255,255,255,0.22)]"
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl xl:text-5xl font-bold mb-6 neon-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Assistência Técnica Eletrônica Especializada
            </h1>
            <p className="text-xl xl:text-2xl text-gray-300 mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              Reparo de eletrônicos, computadores, notebooks e videogames com transparência, tecnologia e mais de 24 anos de experiência
            </p>
            
            {/* Google Rating Badge - Destacado com animação */}
            <div className="inline-flex items-center gap-3 mb-8 bg-card/80 backdrop-blur-sm px-8 py-4 rounded-full border border-primary/30 animate-pulse-glow animate-slide-in-left" style={{ animationDelay: '0.6s' }}>
              <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
                <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
              </svg>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-primary">{formattedRating}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-primary">{formattedTotalReviews}</span> avaliações reais
                </p>
              </div>
            </div>
            
            <div className="flex flex-col xl:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <BudgetWhatsAppModal
                trigger={(
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
                  >
                    Pedir Orçamento
                  </Button>
                )}
              />
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="text-lg px-8 py-6 bg-primary/15 hover:bg-primary/25 text-foreground font-semibold border border-primary/40 hover:border-primary hover:scale-105 transition-all duration-300"
              >
                Cadastrar Agora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/services')}
                className="text-lg px-8 py-6 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary hover:scale-105 transition-all duration-300"
              >
                Nossos Serviços
              </Button>
            </div>
            <HeroProcessMini />
          </div>
        </div>
      </section>
      {/* Como Funciona Section */}
      <section className="hidden md:block py-10 md:py-16 bg-gradient-to-b from-transparent to-card/40 relative">
        <div className="container relative z-10">
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl xl:text-4xl font-bold mb-4">Como funciona na InfoShire</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Menos ligações. Mais transparência. Total controle para o cliente.
            </p>
          </div>

          <ProcessFlowArrows steps={processSteps} />
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-card/50 relative">
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl xl:text-4xl font-bold mb-4">Por que escolher a InfoShire?</h2>
            <p className="text-lg text-muted-foreground">
              Tecnologia e transparência para você acompanhar cada etapa do seu reparo, sem surpresas
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title} 
                  className="bg-card/50 backdrop-blur border-border hover:border-primary transition-all duration-300 hover-lift"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Services Section - Simple and Clean */}
      <section className="py-20 bg-transparent relative">
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl xl:text-4xl font-bold mb-4">Nossos Serviços</h2>
            <p className="text-lg text-muted-foreground">
              Soluções completas para seus equipamentos eletrônicos
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {simpleServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card 
                  key={service.title} 
                  className="group relative overflow-hidden bg-card/50 backdrop-blur border-border hover:border-primary transition-all duration-300 cursor-pointer hover-lift"
                  onClick={() => navigate('/services')}
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Background Image - mais viva */}
                  <div className="absolute inset-0 opacity-60 group-hover:opacity-72 transition-opacity duration-300">
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      style={{ filter: 'saturate(1.15) contrast(1.08)' }}
                    />
                  </div>
                  
                  {/* Gradient Overlay - mais leve para ver a imagem */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/55 to-black/25"></div>
                  
                  {/* Neon edge no hover */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300 rounded-lg"></div>
                  
                  {/* Content */}
                  <CardContent className="relative z-10 p-8 flex flex-col items-center text-center min-h-[320px] justify-end">
                    {/* Icon */}
                    <div className="mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"></div>
                        <div className="relative h-20 w-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary/50 group-hover:border-primary group-hover:bg-primary/30 transition-all duration-300">
                          <Icon className="h-10 w-10 text-primary" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-card/50 relative">
        <div className="container relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header with Google Rating */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-6 bg-card/50 backdrop-blur-sm px-8 py-4 rounded-full border border-primary/30">
                <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none">
                  <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                  <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                  <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                  <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                </svg>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold text-primary">{formattedRating}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className="h-6 w-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Baseado em <span className="font-bold text-primary">{formattedTotalReviews}</span> avaliações</p>
                </div>
              </div>
              <h2 className="text-3xl xl:text-5xl font-bold mb-4">
                Avaliação <span className="text-primary">Excepcional</span> no Google
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Mais de 600 clientes satisfeitos compartilharam suas experiências positivas com nossos serviços
              </p>
            </div>

            {/* Reviews Carousel */}
            <ReviewsCarousel onSummary={setGoogleSummary} />

            <p className="text-center text-xs text-muted-foreground mt-4">
              {googleSummary.cached
                ? `Atualizado há ~${googleSummary.cacheAgeHours?.toFixed(2) ?? 0}h (cache)`
                : 'Atualizado agora'}
            </p>

            {/* Google Maps Verified Reviews Integration */}
            <div className="mt-16">
              <div className="text-center mb-8">
                <h3 className="text-2xl xl:text-3xl font-bold mb-3">
                  Avaliações <span className="text-primary">Reais e Verificáveis</span> diretamente do Google
                </h3>
                <p className="text-muted-foreground">
                  Confira nossa reputação oficial na plataforma Google Maps
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col xl:flex-row gap-4 justify-center items-center mt-8">
                <a
                  href="https://maps.app.goo.gl/P4UHPrFb6vcmSyoA6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 font-semibold"
                >
                  <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                  Ver todas as avaliações no Google
                </a>
                <a
                  href="https://maps.app.goo.gl/P4UHPrFb6vcmSyoA6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-card hover:bg-card/80 text-foreground px-6 py-3 rounded-lg border border-border hover:border-primary transition-all duration-300 font-semibold"
                >
                  <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Avalie-nos no Google
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-card/50 to-transparent relative">
        <div className="container relative z-10">
          <Card className="bg-card/50 border-primary/30 backdrop-blur-sm hover-lift">
            <CardContent className="py-12">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl xl:text-4xl font-bold mb-6 text-primary">
                  Sistema de Acompanhamento Diferenciado
                </h2>
                <p className="text-lg mb-8 text-foreground leading-relaxed">
                  Nosso sistema de acompanhamento de orçamentos e serviços é diferenciado, usamos um sistema moderno que conecta nossos clientes com nossos técnicos, em tempo real, elevando sua experiência de suporte e assistência técnica. Menos ligações, mais transparência e mais confiança.
                </p>
                <p className="text-xl font-semibold mb-8 text-primary">
                  Crie sua conta e acompanhe!
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/register')}
                  className="text-lg px-8 py-6 hover-lift"
                >
                  Criar Conta Grátis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}

function HeroProcessMini() {
  const steps = [
    {
      title: 'Contato no WhatsApp',
      description: 'Explique o problema e envie fotos.',
      icon: MessageSquare,
    },
    {
      title: 'Diagnóstico Técnico',
      description: 'Avaliação completa do defeito.',
      icon: Microscope,
    },
    {
      title: 'Orçamento Transparente',
      description: 'Você aprova online pelo sistema.',
      icon: ShieldCheck,
    },
    {
      title: 'Reparo e Entrega',
      description: 'Reparo realizado e devolução funcionando.',
      icon: Truck,
    },
  ];

  return (
    <div className="mt-10 md:hidden animate-fade-in-up" style={{ animationDelay: '1s' }}>
      <div className="text-center mb-5">
        <h2 className="text-xl font-semibold">Como funciona o atendimento</h2>
        <p className="text-sm text-muted-foreground">Fluxo simples, claro e transparente.</p>
      </div>
      <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex items-center gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-center gap-6 snap-start">
                <Card className="min-w-[80%] bg-card/45 backdrop-blur border border-primary/20 hover:border-primary/45 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/30">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="h-9 w-9 rounded-full bg-primary text-black font-extrabold flex items-center justify-center shadow-[0_0_10px_rgba(139,255,0,0.45)]">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-primary/60 drop-shadow-[0_0_6px_rgba(139,255,0,0.35)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Deslize para seguir a sequência →
      </p>
    </div>
  );
}

function ProcessFlowArrows({ steps }: { steps: ProcessStep[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !isAutoPlaying) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [isAutoPlaying, prefersReducedMotion, steps.length]);

  const goToStep = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentStep((index + steps.length) % steps.length);
  };

  const handlePrev = () => goToStep(currentStep - 1);
  const handleNext = () => goToStep(currentStep + 1);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) {
      return;
    }
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) {
      return;
    }
    if (touchDeltaX.current > 40) {
      handlePrev();
    } else if (touchDeltaX.current < -40) {
      handleNext();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-10">
      <div className="md:hidden space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="h-10 w-10 border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
            aria-label="Etapa anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={`step-dot-${index}`}
                type="button"
                onClick={() => goToStep(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  index === currentStep ? 'bg-primary shadow-[0_0_10px_rgba(139,255,0,0.6)]' : 'bg-primary/30'
                }`}
                aria-label={`Ir para etapa ${index + 1}`}
                aria-current={index === currentStep ? 'step' : undefined}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-10 w-10 border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
            aria-label="Próxima etapa"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div
          className="space-y-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/40">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentStep * 100}%)` }}
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="w-full flex-shrink-0 p-4">
                    <Card className="bg-card/60 backdrop-blur border-primary/40 shadow-[0_0_18px_rgba(139,255,0,0.12)]">
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/30">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          {step.highlight && (
                            <span className="text-[10px] uppercase tracking-wide bg-primary/20 text-primary px-2 py-1 rounded-full border border-primary/40">
                              Diferencial InfoShire
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                        <div className="text-xs uppercase tracking-wide text-primary">
                          Etapa {index + 1} de {steps.length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Etapa {currentStep + 1} de {steps.length}</span>
              {!prefersReducedMotion && !isAutoPlaying && (
                <span className="text-[10px] uppercase tracking-wide text-primary/70">Autoplay pausado</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-4 snap-x snap-mandatory">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <React.Fragment key={step.title}>
                  <Card className="min-w-[340px] max-w-[340px] snap-start bg-card/50 backdrop-blur border-border hover:border-primary/60 transition-all duration-300">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/30">
                          <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="h-8 w-8 rounded-full border border-primary/40 bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                          {index + 1}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      {step.highlight && (
                        <span className="text-[10px] w-fit uppercase tracking-wide bg-primary/20 text-primary px-2 py-1 rounded-full border border-primary/40">
                          Diferencial InfoShire
                        </span>
                      )}
                    </CardContent>
                  </Card>
                  {index < steps.length - 1 && (
                    <div className="flex items-center justify-center px-1 text-primary/70">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de Integração do Google Maps Reviews

// Componente de Carrossel de Avaliações
function ReviewsCarousel({ onSummary }: { onSummary?: (summary: ReviewsSummary) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const maxReviewLength = 180;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Buscar reviews do Google via Edge Function
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-google-reviews');
        
        if (error) {
          console.error('Erro ao buscar reviews:', error);
          // Usar reviews de exemplo em caso de erro
          setReviews(getExampleReviews());
          onSummary?.({ rating: 4.9, totalReviews: 600 });
        } else if (data?.success) {
          const reviewsData = data.data.reviews || [];
          // Embaralhar reviews
          const shuffled = [...reviewsData].sort(() => Math.random() - 0.5);
          setReviews(shuffled);
          onSummary?.({
            rating: data.data.rating,
            totalReviews: data.data.user_ratings_total,
            cached: data.cached,
            cacheAgeHours: data.cache_age_hours,
            cachedAt: data.cached_at ?? null,
          });
        } else {
          // Usar reviews de exemplo
          setReviews(getExampleReviews());
          onSummary?.({ rating: 4.9, totalReviews: 600 });
        }
      } catch (error) {
        console.error('Erro ao buscar reviews:', error);
        // Usar reviews de exemplo em caso de erro
        setReviews(getExampleReviews());
        onSummary?.({ rating: 4.9, totalReviews: 600 });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [onSummary]);

  // Reviews de exemplo (fallback)
  const getExampleReviews = () => [
    {
      author_name: 'Carlos Silva',
      rating: 5,
      text: 'Excelente atendimento! Consertaram meu PlayStation 5 rapidamente e com preço justo. Recomendo!',
      relative_time_description: 'Há 2 semanas',
      profile_photo_url: '',
    },
    {
      author_name: 'Maria Santos',
      rating: 5,
      text: 'Profissionais muito competentes. Recuperaram dados do meu notebook que outros disseram ser impossível. Muito obrigada!',
      relative_time_description: 'Há 1 mês',
      profile_photo_url: '',
    },
    {
      author_name: 'João Oliveira',
      rating: 5,
      text: 'Melhor assistência técnica de Campinas! Reparo de qualidade, atendimento transparente e preços honestos.',
      relative_time_description: 'Há 3 semanas',
      profile_photo_url: '',
    },
    {
      author_name: 'Ana Paula',
      rating: 5,
      text: 'Consertaram meu notebook com perfeição. Ficou como novo! Atendimento rápido e profissional.',
      relative_time_description: 'Há 1 semana',
      profile_photo_url: '',
    },
    {
      author_name: 'Roberto Costa',
      rating: 5,
      text: 'Experiência incrível! Fizeram reballing na minha placa de vídeo e voltou a funcionar perfeitamente. Técnicos muito capacitados!',
      relative_time_description: 'Há 2 meses',
      profile_photo_url: '',
    },
    {
      author_name: 'Fernanda Lima',
      rating: 5,
      text: 'Atendimento excepcional! Explicaram todo o processo, deram garantia e o preço foi muito justo. Super recomendo!',
      relative_time_description: 'Há 1 mês',
      profile_photo_url: '',
    },
  ];

  // Auto-play do carrossel
  useEffect(() => {
    if (!isAutoPlaying || prefersReducedMotion || reviews.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 6000); // Muda a cada 6 segundos

    return () => clearInterval(interval);
  }, [isAutoPlaying, prefersReducedMotion, reviews.length]);

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const toggleReview = (index: number) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="relative mb-8">
      {/* Carrossel Container */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {reviews.map((review, index) => {
            const reviewText = review.text ?? '';
            const isLong = reviewText.length > maxReviewLength;
            const isExpanded = expandedReviews[index];

            return (
              <div key={index} className="w-full flex-shrink-0 px-2">
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 mx-auto max-w-2xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      {review.profile_photo_url ? (
                        <img
                          src={review.profile_photo_url}
                          alt={review.author_name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-bold text-lg">{review.author_name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{review.author_name}</p>
                        <p className="text-xs text-muted-foreground">{review.relative_time_description || 'Recente'}</p>
                      </div>
                    </div>
                    <div className="flex mb-4">
                      {[...Array(review.rating)].map((_, i) => (
                        <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {isLong && !isExpanded
                          ? `${reviewText.slice(0, maxReviewLength).trim()}...`
                          : reviewText}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleReview(index)}
                          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          {isExpanded ? 'Ver menos' : 'Ler mais'}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botões de Navegação */}
      <button
        type="button"
        onClick={goToPrevious}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 xl:-translate-x-12 bg-primary/20 hover:bg-primary/30 text-primary p-3 rounded-full border border-primary/30 hover:border-primary transition-all duration-300 backdrop-blur-sm"
        aria-label="Avaliação anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 xl:translate-x-12 bg-primary/20 hover:bg-primary/30 text-primary p-3 rounded-full border border-primary/30 hover:border-primary transition-all duration-300 backdrop-blur-sm"
        aria-label="Próxima avaliação"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Indicadores de Slide */}
      <div className="flex justify-center gap-2 mt-6">
        {reviews.map((_, index) => (
          <button
            type="button"
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-primary'
                : 'w-2 bg-primary/30 hover:bg-primary/50'
            }`}
            aria-label={`Ir para avaliação ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
