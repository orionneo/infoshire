import { Award, Target, Users, Wrench } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import logoInfoshire from '@/assets/images/logo-infoshire.png';
import aboutTeam1 from '@/assets/images/about-team-1.png';
import aboutTeam2 from '@/assets/images/about-team-2.png';
import aboutTeam3 from '@/assets/images/about-team-3.png';
import aboutTeam4 from '@/assets/images/about-team-4.png';

export default function About() {
  const values = [
    {
      icon: Award,
      title: 'Mais de 24 anos',
      description: 'Experiência consolidada em eletrônica e reparos de alta complexidade',
    },
    {
      icon: Users,
      title: 'Técnicos Especializados',
      description: 'Profissionais qualificados e experientes em eletrônica',
    },
    {
      icon: Target,
      title: 'Laboratório Próprio',
      description: 'Equipamentos profissionais para diagnósticos precisos',
    },
    {
      icon: Wrench,
      title: 'Transparência',
      description: 'Comunicação clara e acompanhamento em tempo real',
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section - Clean layout like Home */}
      <section className="relative bg-transparent py-20 xl:py-32 overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo InfoShire */}
            <div className="mb-8 flex justify-center">
              <div className="w-full max-w-sm xl:max-w-xl relative px-4">
                <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse"></div>
                <img
                  src={logoInfoshire}
                  alt="InfoShire Logo"
                  className="relative w-full h-auto object-contain drop-shadow-[0_0_25px_rgba(139,255,0,0.9)] animate-float"
                />
              </div>
            </div>
            
            <h1 className="text-3xl xl:text-5xl font-bold mb-6 neon-glow">
              Sobre a InfoShire
            </h1>
            <p className="text-xl xl:text-2xl text-gray-300 mb-8">
              Mais de 24 anos de experiência em reparos de alta complexidade com equipamentos de última geração
            </p>
          </div>
        </div>
      </section>
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Nossa História</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A InfoShire é uma assistência técnica especializada em eletrônica com mais de duas décadas de atuação no mercado. Nosso foco é oferecer reparos precisos, atendimento transparente e comunicação clara com nossos clientes.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Utilizamos tecnologia de ponta, laboratório próprio e profissionais qualificados para garantir qualidade e confiança em cada serviço realizado.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Nossa Missão</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Elevar o padrão da assistência técnica através da transparência, tecnologia e comunicação direta entre cliente e técnico. Oferecemos acompanhamento em tempo real do reparo, reduzindo ligações e aumentando a confiança.
                </p>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">Nossos Diferenciais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {values.map((value) => {
                  const Icon = value.icon;
                  return (
                    <Card key={value.title}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                            <p className="text-sm text-muted-foreground">{value.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Image Gallery Section */}
            <div className="mt-12">
              <h2 className="text-3xl font-bold text-center mb-8">
                Nosso <span className="text-primary">Laboratório</span> Técnico
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Laboratory Equipment */}
                <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                  <img
                    src={aboutTeam1}
                    alt="Laboratório de eletrônicos com equipamentos de última geração"
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-bold text-white mb-2">Laboratório Completo</h3>
                      <p className="text-gray-300 text-sm">Equipamentos de última geração para diagnósticos precisos</p>
                    </div>
                  </div>
                </div>

                {/* Microscope Repair */}
                <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                  <img
                    src={aboutTeam2}
                    alt="Reparo de precisão com microscópio profissional"
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-bold text-white mb-2">Reparos de Precisão</h3>
                      <p className="text-gray-300 text-sm">Microscópios profissionais para componentes SMD</p>
                    </div>
                  </div>
                </div>

                {/* Workshop Tools */}
                <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                  <img
                    src={aboutTeam3}
                    alt="Ferramentas e equipamentos profissionais de reparo"
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-bold text-white mb-2">Ferramentas Especializadas</h3>
                      <p className="text-gray-300 text-sm">Equipamentos de alta precisão para todos os tipos de reparo</p>
                    </div>
                  </div>
                </div>

                {/* Testing Equipment */}
                <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                  <img
                    src={aboutTeam4}
                    alt="Equipamentos de teste e diagnóstico eletrônico"
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="text-xl font-bold text-white mb-2">Diagnóstico Avançado</h3>
                      <p className="text-gray-300 text-sm">Osciloscópios e multímetros de alta precisão</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
