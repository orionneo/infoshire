import { Apple, ArrowRight, CheckCircle2, Clock, Database, Gamepad2, HardDrive, Laptop, MessageCircle, Monitor, Shield, Sparkles, Star, Tv, Wrench, Zap } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Services() {
  // Categorias de serviços organizadas por tipo
  const serviceCategories = [
    {
      id: 'consoles',
      category: 'Consoles e Videogames',
      description: 'Seu console não liga, superaquece ou apresenta erros? Somos especialistas em todas as plataformas de jogos.',
      icon: Gamepad2,
      services: [
        {
          icon: Gamepad2,
          title: 'PlayStation (PS5, PS4, PS3, PS2)',
          problem: 'Console não liga, superaquece, erro de leitura ou HDMI sem sinal?',
          description: 'Reparo completo de consoles PlayStation: troca de fonte, reparo de placa-mãe, reballing de GPU, limpeza profunda e troca de pasta térmica.',
          examples: ['Não liga ou desliga sozinho', 'Superaquecimento', 'Erro de leitura de disco', 'Sem imagem HDMI'],
        },
        {
          icon: Gamepad2,
          title: 'Xbox (Series X/S, One, 360)',
          problem: 'Xbox travando, com erro E74, anel vermelho ou não lê jogos?',
          description: 'Conserto especializado em Xbox: correção de erros de sistema, reparo de drive, reballing e manutenção preventiva.',
          examples: ['Anel vermelho da morte', 'Erro E74', 'Drive não abre', 'Travamentos frequentes'],
        },
        {
          icon: Gamepad2,
          title: 'Nintendo (Switch, Wii U, 3DS)',
          problem: 'Switch não carrega, Joy-Con com drift, tela quebrada ou não conecta na TV?',
          description: 'Reparo de Nintendo Switch e portáteis: troca de tela, correção de drift, reparo de porta USB-C e dock.',
          examples: ['Joy-Con com drift', 'Não carrega', 'Tela quebrada', 'Não conecta na TV'],
        },
        {
          icon: Gamepad2,
          title: 'Consoles Retro e Clássicos',
          problem: 'Mega Drive, Super Nintendo, Dreamcast ou outros clássicos com defeito?',
          description: 'Restauração e reparo de consoles clássicos: limpeza de slots, troca de capacitores, reparo de fonte e recuperação de placas.',
          examples: ['Não liga', 'Imagem com defeito', 'Sem áudio', 'Leitura de cartucho falha'],
        },
      ],
    },
    {
      id: 'informatica',
      category: 'Informática e Notebooks',
      description: 'Computador lento, travando ou não liga? Oferecemos diagnóstico completo e soluções para notebooks, desktops e periféricos.',
      icon: Laptop,
      services: [
        {
          icon: Laptop,
          title: 'Notebooks (Todas as Marcas)',
          problem: 'Notebook lento, não liga, superaquece, tela quebrada ou bateria viciada?',
          description: 'Reparo completo de notebooks: troca de tela, teclado, bateria, HD/SSD, memória RAM, reparo de placa-mãe e reballing.',
          examples: ['Não liga', 'Tela quebrada ou piscando', 'Superaquecimento', 'Bateria não carrega', 'Lentidão extrema'],
        },
        {
          icon: Monitor,
          title: 'Computadores Desktop',
          problem: 'PC travando, tela azul, reiniciando sozinho ou não iniciando?',
          description: 'Diagnóstico e reparo de PCs: identificação de componentes defeituosos, limpeza profunda, upgrades e otimização de sistema.',
          examples: ['Tela azul (BSOD)', 'Travamentos', 'Não liga', 'Lentidão', 'Barulhos estranhos'],
        },
        {
          icon: Zap,
          title: 'Placas de Vídeo (GPU)',
          problem: 'Placa de vídeo com artefatos na tela, superaquecendo, não detectada ou com falha?',
          description: 'Reparo avançado de GPUs: reballing de chip gráfico, troca de memória VRAM, troca de capacitores e pasta térmica.',
          examples: ['Artefatos visuais', 'Não é detectada', 'Superaquecimento', 'Tela preta'],
        },
        {
          icon: HardDrive,
          title: 'Upgrades e Melhorias',
          problem: 'Quer deixar seu computador mais rápido e eficiente?',
          description: 'Upgrades personalizados: instalação de SSD, aumento de memória RAM, troca de processador, water cooling e modding.',
          examples: ['Troca de HD por SSD', 'Aumento de RAM', 'Upgrade de processador', 'Sistema de refrigeração'],
        },
        {
          icon: Wrench,
          title: 'Periféricos Gamer',
          problem: 'Mouse, teclado mecânico, headset ou controle com defeito?',
          description: 'Reparo de periféricos: troca de switches, reparo de cabos, limpeza de teclados mecânicos e conserto de controles.',
          examples: ['Teclas não funcionam', 'Mouse com double click', 'Cabo rompido', 'Botões travados'],
        },
      ],
    },
    {
      id: 'apple',
      category: 'Produtos Apple',
      description: 'Especialistas em MacBook, iPad e iMac. Reparo com qualidade e peças certificadas.',
      icon: Apple,
      services: [
        {
          icon: Laptop,
          title: 'MacBook (Air, Pro, iMac)',
          problem: 'MacBook não liga, bateria inchada, teclado com defeito, tela com manchas ou lento?',
          description: 'Reparo especializado em MacBook: troca de bateria, teclado, tela Retina, upgrade de SSD e memória, reparo de placa lógica.',
          examples: ['Bateria inchada', 'Teclado não funciona', 'Tela com manchas', 'Não liga', 'Lentidão'],
        },
        {
          icon: Monitor,
          title: 'iPad (Todas as Gerações)',
          problem: 'iPad com tela quebrada, não carrega, lento ou não liga?',
          description: 'Reparo de iPad: troca de tela touch, bateria, porta de carregamento, botões e atualização de sistema.',
          examples: ['Tela quebrada', 'Não carrega', 'Touch não responde', 'Lentidão', 'Não liga'],
        },
        {
          icon: Apple,
          title: 'iMac (21.5" e 27")',
          problem: 'iMac lento, tela com problema, não liga ou HD com defeito?',
          description: 'Manutenção de iMac: upgrade de SSD, aumento de RAM, troca de tela, reparo de placa lógica e limpeza interna.',
          examples: ['Muito lento', 'Tela com linhas', 'HD com ruído', 'Não liga', 'Superaquecimento'],
        },
      ],
    },
    {
      id: 'tvs',
      category: 'TVs e Eletrônicos',
      description: 'Smart TV não liga, sem imagem ou com defeito? Reparamos TVs de todas as marcas e eletrônicos em geral.',
      icon: Tv,
      services: [
        {
          icon: Tv,
          title: 'Smart TVs (Samsung, LG, Sony, TCL)',
          problem: 'TV não liga, sem imagem, com linhas na tela, sem som ou LED piscando?',
          description: 'Reparo de Smart TVs: troca de placa T-CON, fonte, LED backlight, atualização de firmware e reparo de placas.',
          examples: ['Não liga', 'Tela preta com som', 'Linhas na tela', 'LED piscando', 'Sem som'],
        },
        {
          icon: Monitor,
          title: 'Monitores (LCD, LED, Gaming)',
          problem: 'Monitor sem imagem, com pixels mortos, não liga ou com manchas?',
          description: 'Conserto de monitores: reparo de fonte, placa lógica, troca de capacitores e correção de problemas de imagem.',
          examples: ['Não liga', 'Sem imagem', 'Pixels mortos', 'Manchas na tela', 'Pisca e apaga'],
        },
        {
          icon: Zap,
          title: 'Placas Eletrônicas',
          problem: 'Equipamento eletrônico queimou, não liga ou com componente danificado?',
          description: 'Recuperação de placas eletrônicas: identificação de componentes queimados, troca de capacitores, resistores e CIs.',
          examples: ['Placa queimada', 'Componente danificado', 'Curto-circuito', 'Não liga após queda de energia'],
        },
      ],
    },
    {
      id: 'dados',
      category: 'Recuperação de Dados',
      description: 'Perdeu arquivos importantes? Recuperamos dados de HDs, SSDs, pendrives e cartões de memória.',
      icon: Database,
      services: [
        {
          icon: HardDrive,
          title: 'HD e SSD',
          problem: 'HD não é reconhecido, com ruído estranho, formatado por engano ou com setores defeituosos?',
          description: 'Recuperação profissional de dados: resgate de arquivos deletados, HDs com defeito mecânico, SSDs corrompidos e pendrives.',
          examples: ['HD não reconhecido', 'Arquivos deletados', 'HD com ruído', 'SSD corrompido', 'Formatação acidental'],
        },
        {
          icon: Database,
          title: 'Cartões de Memória e Pendrives',
          problem: 'Cartão SD corrompido, pendrive não reconhecido ou arquivos inacessíveis?',
          description: 'Recuperação de fotos, vídeos e documentos de cartões SD, microSD, pendrives e outros dispositivos de armazenamento.',
          examples: ['Cartão corrompido', 'Pendrive não reconhecido', 'Fotos inacessíveis', 'Erro de leitura'],
        },
        {
          icon: Shield,
          title: 'Backup e Migração de Dados',
          problem: 'Precisa fazer backup seguro ou migrar dados para novo equipamento?',
          description: 'Serviço de backup completo, clonagem de disco, migração de sistema operacional e transferência segura de arquivos.',
          examples: ['Backup completo', 'Clonagem de HD', 'Migração para SSD', 'Transferência de dados'],
        },
      ],
    },
    {
      id: 'especializados',
      category: 'Serviços Especializados',
      description: 'Técnicas avançadas de reparo eletrônico para casos complexos que outros não conseguem resolver.',
      icon: Wrench,
      services: [
        {
          icon: Zap,
          title: 'Reballing Profissional',
          problem: 'GPU, CPU ou chip BGA com falha de solda, artefatos ou não funciona?',
          description: 'Reballing de alta precisão com estação BGA profissional: GPUs, CPUs, chips de memória, controladores e CIs.',
          examples: ['GPU com artefatos', 'Chip BGA com falha', 'Notebook não liga (chip gráfico)', 'Console com erro de vídeo'],
        },
        {
          icon: Sparkles,
          title: 'Higienização Profissional',
          problem: 'Equipamento sujo, com poeira acumulada, superaquecendo ou com mau cheiro?',
          description: 'Limpeza completa com cuba ultrassônica, remoção de oxidação, troca de pasta térmica premium e thermal pads.',
          examples: ['Superaquecimento', 'Poeira acumulada', 'Oxidação', 'Ventilador barulhento'],
        },
        {
          icon: Wrench,
          title: 'Diagnóstico Avançado',
          problem: 'Problema complexo que ninguém conseguiu identificar ou resolver?',
          description: 'Diagnóstico técnico profissional com equipamentos especializados: osciloscópio, multímetro, estação de solda e ferramentas de precisão.',
          examples: ['Defeito intermitente', 'Problema não identificado', 'Equipamento "condenado"', 'Falha complexa'],
        },
        {
          icon: Shield,
          title: 'Manutenção Preventiva',
          problem: 'Quer evitar problemas futuros e prolongar a vida útil do seu equipamento?',
          description: 'Check-up completo, limpeza interna, troca de pasta térmica, atualização de drivers e otimização de sistema.',
          examples: ['Limpeza preventiva', 'Troca de pasta térmica', 'Otimização', 'Check-up anual'],
        },
      ],
    },
  ];

  // Diferenciais da Infoshire
  const differentials = [
    {
      icon: Star,
      title: 'Mais de 600 avaliações 4.9⭐ no Google',
      description: 'Reputação comprovada por centenas de clientes satisfeitos',
    },
    {
      icon: Shield,
      title: 'Diagnóstico técnico profissional e transparente',
      description: 'Explicamos o problema de forma clara antes de qualquer reparo',
    },
    {
      icon: Wrench,
      title: 'Experiência com casos complexos',
      description: 'Resolvemos problemas que outros técnicos não conseguiram',
    },
    {
      icon: Clock,
      title: 'Mais de 24 anos de experiência',
      description: 'Conhecimento consolidado em eletrônica e reparos avançados',
    },
  ];

  // Como funciona o atendimento
  const howItWorks = [
    {
      step: '1',
      title: 'Contato e Descrição',
      description: 'Entre em contato pelo WhatsApp e descreva o problema do seu equipamento',
      icon: MessageCircle,
    },
    {
      step: '2',
      title: 'Diagnóstico Técnico',
      description: 'Realizamos um diagnóstico completo para identificar a causa do defeito',
      icon: Wrench,
    },
    {
      step: '3',
      title: 'Orçamento Transparente',
      description: 'Apresentamos um orçamento claro com o valor e prazo do reparo',
      icon: CheckCircle2,
    },
    {
      step: '4',
      title: 'Reparo e Entrega',
      description: 'Após sua aprovação, realizamos o reparo e devolvemos o equipamento funcionando',
      icon: Shield,
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section
        className="relative bg-transparent pt-28 pb-20 xl:pt-32 xl:pb-32 overflow-hidden"
        style={{ backgroundImage: 'none' }}
      >
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl xl:text-6xl font-bold mb-6">
              Serviços Especializados em <span className="text-primary">Reparo e Manutenção</span> de Eletrônicos
            </h1>
            <p className="text-xl xl:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Diagnóstico profissional, transparência total e experiência comprovada para resolver o problema do seu equipamento
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/30">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold">4.9 no Google</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/30">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">+24 anos</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/30">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">+600 clientes</span>
              </div>
            </div>
            
            {/* CTA Principal */}
            <a
              href="https://wa.me/5519993352727?text=Olá,%20estou%20vindo%20do%20site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(139,255,0,0.3)] hover:shadow-[0_0_40px_rgba(139,255,0,0.5)]"
            >
              <MessageCircle className="h-5 w-5" />
              Falar com um Especialista no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Serviços por Categoria */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="space-y-20">
            {serviceCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.id} id={category.id} className="scroll-mt-20">
                  {/* Category Header */}
                  <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="h-7 w-7 text-primary" />
                      </div>
                      <h2 className="text-3xl xl:text-4xl font-bold">{category.category}</h2>
                    </div>
                    <p className="text-lg xl:text-xl text-muted-foreground max-w-3xl">
                      {category.description}
                    </p>
                  </div>

                  {/* Service Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {category.services.map((service, index) => {
                      const ServiceIcon = service.icon;
                      const whatsappUrl = `https://wa.me/5519993352727?text=${encodeURIComponent(`Olá, estou vindo do site`)}`;
                      
                      return (
                        <Card key={index} className="bg-card border-border hover:border-primary transition-all duration-300 group">
                          <CardContent className="p-6">
                            {/* Icon and Title */}
                            <div className="flex items-start gap-4 mb-4">
                              <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                                  <ServiceIcon className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
                                  {service.title}
                                </h3>
                                <p className="text-sm text-primary font-semibold mb-3">
                                  {service.problem}
                                </p>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                              {service.description}
                            </p>

                            {/* Examples */}
                            {service.examples && service.examples.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm font-semibold text-foreground mb-2">Exemplos comuns:</p>
                                <ul className="space-y-1">
                                  {service.examples.map((example, i) => (
                                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                      <span>{example}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* CTA Button */}
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 w-full justify-center bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 font-semibold group-hover:shadow-[0_0_20px_rgba(139,255,0,0.3)]"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Solicitar Orçamento
                            </a>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Diferenciais da Infoshire */}
      <section className="py-20 bg-gradient-to-b from-background to-card">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl xl:text-4xl font-bold mb-4">
                Por que escolher a <span className="text-primary">Infoshire</span>?
              </h2>
              <p className="text-lg text-muted-foreground">
                Confiança, experiência e resultados comprovados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {differentials.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card key={index} className="bg-card/50 backdrop-blur-sm border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                          <p className="text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona o Atendimento */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl xl:text-4xl font-bold mb-4">
                Como funciona o <span className="text-primary">atendimento</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Processo simples, transparente e sem surpresas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {howItWorks.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="relative">
                    {/* Connector Line (desktop only) */}
                    {index < howItWorks.length - 1 && (
                      <div className="hidden xl:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-primary/30"></div>
                    )}
                    
                    <Card className="bg-background border-border hover:border-primary transition-all duration-300 relative z-10">
                      <CardContent className="p-6 text-center">
                        {/* Step Number */}
                        <div className="relative inline-flex items-center justify-center mb-4">
                          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                          <div className="relative h-16 w-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            <Icon className="h-8 w-8 text-primary" />
                          </div>
                          <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            {step.step}
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-b from-card to-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 overflow-hidden">
              <CardContent className="p-8 xl:p-12 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/30 mb-6">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Atendimento Especializado</span>
                </div>
                
                <h2 className="text-3xl xl:text-4xl font-bold mb-4">
                  Pronto para resolver o problema do seu equipamento?
                </h2>
                
                <p className="text-lg xl:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Fale agora com um especialista da Infoshire. Diagnóstico profissional, orçamento transparente e reparo com garantia.
                </p>
                
                <div className="flex flex-col xl:flex-row gap-4 justify-center items-center">
                  <a
                    href="https://wa.me/5519993352727?text=Olá,%20estou%20vindo%20do%20site"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(139,255,0,0.3)] hover:shadow-[0_0_40px_rgba(139,255,0,0.5)]"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Falar Agora no WhatsApp
                  </a>
                  
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-lg px-8 py-4"
                  >
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Ver Todos os Serviços
                  </Button>
                </div>
                
                {/* Trust Elements */}
                <div className="flex flex-wrap justify-center gap-6 mt-10 pt-8 border-t border-primary/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">4.9⭐</div>
                    <div className="text-sm text-muted-foreground">Avaliação Google</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">+600</div>
                    <div className="text-sm text-muted-foreground">Clientes Atendidos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">+24</div>
                    <div className="text-sm text-muted-foreground">Anos de Experiência</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
