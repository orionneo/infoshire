import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Eye, 
  Users, 
  MousePointerClick, 
  Clock, 
  TrendingUp,
  Globe,
  Smartphone,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  Search,
  Facebook,
  LogIn
} from 'lucide-react';
import { 
  getAnalyticsSummary, 
  getTrafficSources, 
  getTopPages, 
  getClickEvents,
  getVisitsByDay,
  getVisitorLocations
} from '@/db/api';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  
  // Summary data
  const [summary, setSummary] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    totalPageviews: 0,
    totalEvents: 0,
    avgDuration: 0,
    days: 30,
  });

  // Traffic sources
  const [sources, setSources] = useState<Array<{ type: string; count: number; percentage: number }>>([]);
  
  // Top pages
  const [topPages, setTopPages] = useState<Array<{ path: string; title: string; views: number }>>([]);
  
  // Click events
  const [events, setEvents] = useState<Array<{ type: string; count: number }>>([]);
  
  // Visits by day
  const [visitsByDay, setVisitsByDay] = useState<Array<{ date: string; visits: number }>>([]);
  
  // Locations
  const [locations, setLocations] = useState<Array<{ city: string; country: string; count: number }>>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryData, sourcesData, pagesData, eventsData, visitsData, locationsData] = await Promise.all([
        getAnalyticsSummary(period),
        getTrafficSources(period),
        getTopPages(period, 5),
        getClickEvents(period),
        getVisitsByDay(period),
        getVisitorLocations(period, 5),
      ]);

      setSummary(summaryData);
      setSources(sourcesData);
      setTopPages(pagesData);
      setEvents(eventsData);
      setVisitsByDay(visitsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'google': return <Search className="h-5 w-5 text-blue-600" />;
      case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'facebook': return <Globe className="h-5 w-5 text-blue-700" />;
      case 'whatsapp': return <MessageCircle className="h-5 w-5 text-green-600" />;
      case 'direct': return <Globe className="h-5 w-5 text-gray-600" />;
      default: return <Globe className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSourceName = (type: string) => {
    switch (type) {
      case 'google': return 'Google';
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'whatsapp': return 'WhatsApp';
      case 'direct': return 'Acesso Direto';
      default: return 'Outros';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'whatsapp_click': return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'phone_click': return <Phone className="h-4 w-4 text-blue-600" />;
      case 'email_click': return <Mail className="h-4 w-4 text-orange-600" />;
      case 'instagram_click': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'facebook_click': return <Facebook className="h-4 w-4 text-blue-700" />;
      case 'budget_click': return <MousePointerClick className="h-4 w-4 text-purple-600" />;
      case 'login_click': return <LogIn className="h-4 w-4 text-indigo-600" />;
      default: return <MousePointerClick className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventName = (type: string) => {
    switch (type) {
      case 'whatsapp_click': return 'WhatsApp';
      case 'phone_click': return 'Telefone';
      case 'email_click': return 'E-mail';
      case 'instagram_click': return 'Instagram';
      case 'facebook_click': return 'Facebook';
      case 'budget_click': return 'Orçamento';
      case 'login_click': return 'Login';
      default: return 'Outros';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics do Site</h1>
            <p className="text-muted-foreground mt-1">
              Veja como as pessoas estão encontrando e interagindo com seu site
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={period === 7 ? 'default' : 'outline'}
              onClick={() => setPeriod(7)}
              size="sm"
            >
              7 dias
            </Button>
            <Button
              variant={period === 30 ? 'default' : 'outline'}
              onClick={() => setPeriod(30)}
              size="sm"
            >
              30 dias
            </Button>
            <Button
              variant={period === 90 ? 'default' : 'outline'}
              onClick={() => setPeriod(90)}
              size="sm"
            >
              90 dias
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pessoas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueVisitors}</div>
              <p className="text-xs text-muted-foreground">
                Visitantes únicos nos últimos {period} dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitas</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalVisits}</div>
              <p className="text-xs text-muted-foreground">
                Total de acessos ao site
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Páginas Vistas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalPageviews}</div>
              <p className="text-xs text-muted-foreground">
                Páginas visualizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(summary.avgDuration)}</div>
              <p className="text-xs text-muted-foreground">
                Permanência no site
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              De Onde as Pessoas Estão Vindo
            </CardTitle>
            <CardDescription>
              Principais origens de tráfego do seu site
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de origem disponível ainda
              </p>
            ) : (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div key={source.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSourceIcon(source.type)}
                      <div>
                        <p className="font-medium">{getSourceName(source.type)}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.count} {source.count === 1 ? 'visita' : 'visitas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{source.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Páginas Mais Acessadas
              </CardTitle>
              <CardDescription>
                O que as pessoas mais visualizam
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma página visualizada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {topPages.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{page.title}</p>
                          <p className="text-xs text-muted-foreground">{page.path}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">{page.views} views</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Click Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5" />
                Cliques Importantes
              </CardTitle>
              <CardDescription>
                Quantas pessoas entraram em contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum clique registrado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.type)}
                        <p className="font-medium">{getEventName(event.type)}</p>
                      </div>
                      <p className="text-lg font-bold">{event.count}</p>
                    </div>
                  ))}
                </div>
              )}
              {events.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                  💡 Esses cliques mostram o interesse real das pessoas em entrar em contato com você
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              De Onde São os Visitantes
            </CardTitle>
            <CardDescription>
              Principais cidades e regiões
            </CardDescription>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de localização disponível ainda
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {locations.map((location) => (
                  <div key={`${location.city}-${location.country}`} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{location.city}</p>
                      <p className="text-sm text-muted-foreground">{location.country}</p>
                    </div>
                    <p className="text-lg font-bold">{location.count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Esses dados mostram como as pessoas estão encontrando seu site e se interessando pelos seus serviços. 
              Use essas informações para entender o que funciona melhor e onde focar seus esforços de divulgação.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
