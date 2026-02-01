import { PublicLayout } from '@/components/layouts/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import logoInfoshire from '@/assets/images/logo-infoshire.png';

const CONTACT_EMAIL = 'diogofzanon@gmail.com';
const LAST_UPDATED = '8 de março de 2025';

export default function Privacy() {
  return (
    <PublicLayout>
      <section
        className="relative bg-transparent pt-28 pb-20 xl:pt-32 xl:pb-32 overflow-hidden"
        style={{ backgroundImage: 'none' }}
      >
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
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
              Política de Privacidade – InfoShire
            </h1>
            <p className="text-xl xl:text-2xl text-gray-300 mb-8">
              Transparência, segurança e respeito aos seus dados em cada etapa da sua experiência.
            </p>
          </div>
        </div>
      </section>

      <div className="container pb-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-10 text-sm sm:text-base">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">1. Introdução</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A InfoShire leva a sua privacidade a sério. Esta política descreve como coletamos, usamos e protegemos
                  seus dados pessoais, garantindo transparência e conformidade com as melhores práticas de segurança.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Nosso objetivo é explicar de forma clara quais informações são tratadas para viabilizar o acesso à
                  plataforma e entregar nossos serviços com excelência.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">2. Dados que coletamos</h2>
                <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                  <li>Nome;</li>
                  <li>Endereço de e-mail;</li>
                  <li>Imagem de perfil (avatar), quando disponível;</li>
                  <li>Provedor de autenticação (Google);</li>
                  <li>Dados técnicos necessários para o funcionamento do sistema (sessões e logs de acesso).</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">3. Autenticação com Google OAuth</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A InfoShire utiliza o Google OAuth para autenticação. Isso significa que não armazenamos senhas e que o
                  processo de login é realizado de forma segura diretamente pelo Google.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Acessamos apenas informações básicas do seu perfil — nome, e-mail e avatar — para criar e manter a sua
                  conta ativa. A infraestrutura de autenticação e identidade é fornecida pela Supabase.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">4. Como usamos seus dados</h2>
                <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                  <li>Criação e autenticação da conta;</li>
                  <li>Comunicações relacionadas aos serviços;</li>
                  <li>Segurança do sistema e integridade operacional;</li>
                  <li>Melhoria contínua da plataforma, sem revenda de dados para marketing.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">5. Compartilhamento de dados</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Seus dados não são vendidos e não são compartilhados para fins publicitários. O processamento ocorre
                  apenas com provedores confiáveis (Google e Supabase) para autenticação e infraestrutura do sistema.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">6. Segurança da informação</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Adotamos práticas de segurança alinhadas a padrões do mercado, com infraestrutura protegida,
                  criptografia e controles de acesso para garantir a confidencialidade e integridade dos dados.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">7. Direitos do usuário</h2>
                <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                  <li>Solicitar acesso, correção ou exclusão dos seus dados pessoais;</li>
                  <li>Revogar o acesso da InfoShire à sua conta Google a qualquer momento;</li>
                  <li>Entrar em contato para solicitações de privacidade pelo e-mail indicado abaixo.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">8. Cookies e sessões</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies e sessões apenas para autenticação e gerenciamento de acesso. Não usamos cookies de
                  publicidade ou rastreamento.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">9. Atualizações desta política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Esta política pode ser atualizada periodicamente para refletir melhorias ou mudanças regulatórias.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold">10. Contato</h2>
                <div className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <span className="font-semibold text-foreground">InfoShire</span>
                  </p>
                  <p>
                    Website:{' '}
                    <a
                      className="text-primary hover:underline"
                      href="https://infoshire.com.br"
                      rel="noreferrer"
                      target="_blank"
                    >
                      https://infoshire.com.br
                    </a>
                  </p>
                  <p>
                    E-mail:{' '}
                    <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </div>
              </section>

              <div className="border-t border-border pt-6 text-sm text-muted-foreground">
                Última atualização: <span className="text-foreground font-medium">{LAST_UPDATED}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
