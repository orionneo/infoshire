import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Download, DollarSign, FileText, Loader2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getDailyRevenue,
  getFinancialOrdersDetails,
  getFinancialSummary,
  getMonthlyRevenue,
  type DailyRevenue,
  type FinancialSummary,
  type MonthlyRevenue,
} from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { ServiceOrderWithClient } from '@/types/types';

export default function AdminFinancial() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [orders, setOrders] = useState<ServiceOrderWithClient[]>([]);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, [viewMode, selectedYear, startDate, endDate]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Calcular datas baseadas no modo de visualização
      let start = startDate;
      let end = endDate;

      if (!start && !end) {
        if (viewMode === 'monthly') {
          start = `${selectedYear}-01-01`;
          end = `${selectedYear}-12-31`;
        } else {
          // Últimos 30 dias para visualização diária
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          start = thirtyDaysAgo.toISOString().split('T')[0];
          end = today.toISOString().split('T')[0];
        }
      }

      const [summaryData, ordersData] = await Promise.all([
        getFinancialSummary(start, end),
        getFinancialOrdersDetails(start, end),
      ]);

      setSummary(summaryData);
      setOrders(ordersData);

      if (viewMode === 'daily' && start && end) {
        const daily = await getDailyRevenue(start, end);
        setDailyData(daily);
      } else if (viewMode === 'monthly') {
        const monthly = await getMonthlyRevenue(selectedYear);
        setMonthlyData(monthly);
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados financeiros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Criar conteúdo HTML para o PDF
      const content = generatePDFContent();
      
      // Abrir janela de impressão (navegador converte para PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar um pouco para garantir que o conteúdo foi carregado
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({
        title: 'Exportação iniciada',
        description: 'Use a opção "Salvar como PDF" na janela de impressão',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar o relatório',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const generatePDFContent = () => {
    const currentDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const periodText = viewMode === 'monthly' 
      ? `Ano ${selectedYear}` 
      : `${startDate ? format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR }) : ''} - ${endDate ? format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR }) : ''}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório Financeiro - ${periodText}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
          }
          h1 {
            color: #1a1a1a;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
          }
          h2 {
            color: #3b82f6;
            margin-top: 30px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            padding: 20px;
            border-radius: 8px;
          }
          .summary-card h3 {
            color: #6b7280;
            font-size: 14px;
            margin: 0 0 10px 0;
          }
          .summary-card p {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            color: #1a1a1a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Relatório Financeiro</h1>
        <p><strong>Período:</strong> ${periodText}</p>
        <p><strong>Gerado em:</strong> ${currentDate}</p>

        <h2>Resumo Geral</h2>
        <div class="summary">
          <div class="summary-card">
            <h3>Receita Total</h3>
            <p>R$ ${summary?.totalRevenue.toFixed(2).replace('.', ',')}</p>
          </div>
          <div class="summary-card">
            <h3>Total de Ordens</h3>
            <p>${summary?.totalOrders}</p>
          </div>
          <div class="summary-card">
            <h3>Ticket Médio</h3>
            <p>R$ ${summary?.averageOrderValue.toFixed(2).replace('.', ',')}</p>
          </div>
          <div class="summary-card">
            <h3>Ordens Concluídas</h3>
            <p>${summary?.completedOrders}</p>
          </div>
        </div>

        ${viewMode === 'monthly' ? `
          <h2>Receita Mensal</h2>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Receita</th>
                <th>Ordens</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.map(item => `
                <tr>
                  <td>${format(new Date(item.month + '-15T12:00:00.000Z'), 'MMMM/yyyy', { locale: ptBR })}</td>
                  <td>R$ ${item.revenue.toFixed(2).replace('.', ',')}</td>
                  <td>${item.orders}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <h2>Receita Diária</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Receita</th>
                <th>Ordens</th>
              </tr>
            </thead>
            <tbody>
              ${dailyData.map(item => `
                <tr>
                  <td>${format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td>R$ ${item.revenue.toFixed(2).replace('.', ',')}</td>
                  <td>${item.orders}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <h2>Detalhes das Ordens</h2>
        <table>
          <thead>
            <tr>
              <th>OS</th>
              <th>Cliente</th>
              <th>Equipamento</th>
              <th>Data Aprovação</th>
              <th>Valor</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => {
              const labor = Number(order.labor_cost) || 0;
              const parts = Number(order.parts_cost) || 0;
              const subtotal = labor + parts;
              const discount = Number(order.discount_amount) || 0;
              const final = Number(order.total_cost) || Math.max(subtotal - discount, 0);
              return `
                <tr>
                  <td>${order.order_number}</td>
                  <td>${order.client?.name || 'N/A'}</td>
                  <td>${order.equipment}</td>
                  <td>${order.approved_at ? format(new Date(order.approved_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</td>
                  <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                  <td>R$ ${discount.toFixed(2).replace('.', ',')}</td>
                  <td>R$ ${final.toFixed(2).replace('.', ',')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Assistências Técnicas</p>
        </div>
      </body>
      </html>
    `;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold">Relatórios Financeiros</h1>
              <p className="text-sm text-muted-foreground">Acompanhe receitas e análises financeiras</p>
            </div>
            <Button onClick={exportToPDF} disabled={exporting} className="w-full xl:w-auto">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o período para análise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Visualização</Label>
                <Select value={viewMode} onValueChange={(value: 'daily' | 'monthly') => setViewMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {viewMode === 'monthly' && (
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={loadFinancialData} variant="default">
                <Calendar className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              <Button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedYear(new Date().getFullYear());
                }}
                variant="outline"
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor líquido após descontos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ordens aprovadas no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.averageOrderValue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor médio por ordem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordens Concluídas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.completedOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.pendingOrders || 0} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com Gráficos e Tabelas */}
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="orders">Detalhes das Ordens</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === 'monthly' ? 'Receita Mensal' : 'Receita Diária'}
                </CardTitle>
                <CardDescription>
                  Visualização gráfica das receitas no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Gráfico de barras simples usando CSS */}
                <div className="space-y-4">
                  {viewMode === 'monthly' ? (
                    monthlyData.length > 0 ? (
                      monthlyData.map((item) => {
                        const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
                        const percentage = (item.revenue / maxRevenue) * 100;
                        
                        return (
                          <div key={item.month} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {format(new Date(item.month + '-15T12:00:00.000Z'), 'MMMM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.revenue)} ({item.orders} ordens)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                              <div
                                className="bg-primary h-full flex items-center justify-end pr-2 text-primary-foreground text-xs font-medium transition-all"
                                style={{ width: `${percentage}%` }}
                              >
                                {percentage > 10 && `${percentage.toFixed(0)}%`}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum dado disponível para o período selecionado
                      </p>
                    )
                  ) : (
                    dailyData.length > 0 ? (
                      dailyData.map((item) => {
                        const maxRevenue = Math.max(...dailyData.map(d => d.revenue));
                        const percentage = (item.revenue / maxRevenue) * 100;
                        
                        return (
                          <div key={item.date} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.revenue)} ({item.orders} ordens)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                              <div
                                className="bg-primary h-full flex items-center justify-end pr-2 text-primary-foreground text-xs font-medium transition-all"
                                style={{ width: `${percentage}%` }}
                              >
                                {percentage > 10 && `${percentage.toFixed(0)}%`}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum dado disponível para o período selecionado
                      </p>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === 'monthly' ? 'Receita Mensal' : 'Receita Diária'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{viewMode === 'monthly' ? 'Mês' : 'Data'}</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Ordens</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewMode === 'monthly' ? (
                      monthlyData.length > 0 ? (
                        monthlyData.map((item) => (
                          <TableRow key={item.month}>
                            <TableCell className="font-medium">
                              {format(new Date(item.month + '-15T12:00:00.000Z'), 'MMMM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right">{item.orders}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.revenue / item.orders)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum dado disponível
                          </TableCell>
                        </TableRow>
                      )
                    ) : (
                      dailyData.length > 0 ? (
                        dailyData.map((item) => (
                          <TableRow key={item.date}>
                            <TableCell className="font-medium">
                              {format(new Date(item.date), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right">{item.orders}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.revenue / item.orders)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum dado disponível
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes das Ordens</CardTitle>
                <CardDescription>
                  Lista completa de ordens aprovadas no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Data Aprovação</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length > 0 ? (
                        orders.map((order) => {
                          const labor = Number(order.labor_cost) || 0;
                          const parts = Number(order.parts_cost) || 0;
                          const subtotal = labor + parts;
                          const discount = Number(order.discount_amount) || 0;
                          const final = Number(order.total_cost) || Math.max(subtotal - discount, 0);

                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.order_number}</TableCell>
                              <TableCell>{order.client?.name || 'N/A'}</TableCell>
                              <TableCell>{order.equipment}</TableCell>
                              <TableCell>
                                {order.approved_at
                                  ? format(new Date(order.approved_at), 'dd/MM/yyyy', { locale: ptBR })
                                  : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                              <TableCell className="text-right text-orange-600">
                                {discount > 0 ? `-${formatCurrency(discount)}` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(final)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhuma ordem encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
