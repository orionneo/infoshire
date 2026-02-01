import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import logoInfoshire from '@/assets/images/logo-infoshire.png';
import contactWhatsapp from '@/assets/images/contact-whatsapp.png';
import contactInstagram from '@/assets/images/contact-instagram.png';
import contactMaps from '@/assets/images/contact-maps.png';

export default function Contact() {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      name: '',
      message: '',
    },
  });
  const whatsappLinkRef = useRef<HTMLAnchorElement | null>(null);
  const fallbackWhatsappUrl = 'https://wa.me/5519993352727?text=Olá,%20estou%20vindo%20do%20site';

  const onSubmit = (_data: any) => {
    // Formatar mensagem para WhatsApp
    const whatsappMessage = `Olá, estou vindo do site`;
    const whatsappUrl = `https://wa.me/5519993352727?text=${encodeURIComponent(whatsappMessage)}`;
    
    // Abrir WhatsApp em nova aba
    if (whatsappLinkRef.current) {
      whatsappLinkRef.current.href = whatsappUrl;
      whatsappLinkRef.current.click();
    }
    
    toast({
      title: 'Redirecionando para WhatsApp!',
      description: 'Você será direcionado para conversar com nosso técnico.',
    });
    
    form.reset();
  };

  return (
    <PublicLayout>
      {/* Hero Section - Clean layout like Home */}
      <section
        className="relative bg-transparent pt-28 pb-20 xl:pt-32 xl:pb-32 overflow-hidden"
        style={{ backgroundImage: 'none' }}
      >
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
              Entre em Contato
            </h1>
            <p className="text-xl xl:text-2xl text-gray-300 mb-8">
              Estamos prontos para atender você com tecnologia de ponta e atendimento especializado
            </p>
          </div>
        </div>
      </section>
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Endereço</p>
                      <p className="text-sm text-muted-foreground">
                        Rua Expedicionario Helio Alves de Camargo, 618<br />
                        Jd. Chapadão, Campinas - SP
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">(19) 99335-2727</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">E-mail</p>
                      <p className="text-sm text-muted-foreground">zanonthiago@hotmail.com</p>
                    </div>
                  </div>
                  
                  {/* Navigation Links */}
                  <div className="pt-4 border-t border-border">
                    <p className="font-medium mb-3 flex items-center gap-2">
                      <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Como Chegar
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href="https://www.google.com/maps/dir/?api=1&destination=Rua+Expedicionario+Helio+Alves+de+Camargo,+614,+Jd.+Chapadão,+Campinas+-+SP"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-sm font-medium hover:scale-105"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Google Maps
                      </a>
                      <a
                        href="https://waze.com/ul?q=Rua+Expedicionario+Helio+Alves+de+Camargo,+614,+Jd.+Chapadão,+Campinas+-+SP"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-3 rounded-lg border border-primary/30 hover:border-primary transition-all duration-300 text-sm font-medium hover:scale-105"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        Waze
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horário de Atendimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Segunda a Sexta</span>
                      <span className="font-medium">9h às 18h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sábado</span>
                      <span className="font-medium">9h às 13h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domingo</span>
                      <span className="font-medium">Fechado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Enviar Mensagem via WhatsApp
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Preencha o formulário abaixo e você será direcionado para conversar diretamente com nosso técnico no WhatsApp: <span className="font-semibold text-primary">+55 19 99335-2727</span>
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <a ref={whatsappLinkRef} href={fallbackWhatsappUrl} className="sr-only">
                      WhatsApp
                    </a>
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: 'Nome é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seu Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      rules={{ required: 'Mensagem é obrigatória' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sua Mensagem</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva seu problema ou dúvida..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full neon-hover" size="lg">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Enviar para WhatsApp
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Image Gallery Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              Visite Nosso <span className="text-primary">Laboratório</span>
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Conheça nossa estrutura completa com equipamentos de última geração para atender você com excelência
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Laboratory */}
              <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                <img
                  src={contactWhatsapp}
                  alt="Laboratório InfoShire - Equipamentos profissionais"
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Laboratório Completo</h3>
                    <p className="text-gray-300 text-sm">Estrutura profissional para todos os tipos de reparo</p>
                  </div>
                </div>
              </div>

              {/* Precision Work */}
              <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                <img
                  src={contactInstagram}
                  alt="Trabalho de precisão com microscópio"
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Trabalho de Precisão</h3>
                    <p className="text-gray-300 text-sm">Reparos microscópicos de alta complexidade</p>
                  </div>
                </div>
              </div>

              {/* Testing Equipment */}
              <div className="relative group overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300">
                <img
                  src={contactMaps}
                  alt="Equipamentos de teste e diagnóstico"
                  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white mb-2">Diagnóstico Avançado</h3>
                    <p className="text-gray-300 text-sm">Equipamentos de teste de última geração</p>
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
