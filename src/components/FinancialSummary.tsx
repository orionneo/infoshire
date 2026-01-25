import { DollarSign, TrendingUp, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinancialSummaryProps {
  totalRevenue: number;
  laborRevenue: number;
  partsRevenue: number;
  approvedOrdersCount: number;
  month: number;
  year: number;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function FinancialSummary({
  totalRevenue,
  laborRevenue,
  partsRevenue,
  approvedOrdersCount,
  month,
  year,
}: FinancialSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const laborPercentage = totalRevenue > 0 ? (laborRevenue / totalRevenue) * 100 : 0;
  const partsPercentage = totalRevenue > 0 ? (partsRevenue / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Resumo Financeiro</h2>
        <span className="text-sm text-muted-foreground">
          {monthNames[month - 1]} {year}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="border-2 border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedOrdersCount} {approvedOrdersCount === 1 ? 'orçamento aprovado' : 'orçamentos aprovados'}
            </p>
          </CardContent>
        </Card>

        {/* Labor Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mão de Obra</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(laborRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {laborPercentage.toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        {/* Parts Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peças</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(partsRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {partsPercentage.toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        {/* Average per Order */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(approvedOrdersCount > 0 ? totalRevenue / approvedOrdersCount : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por ordem de serviço
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Labor Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Mão de Obra</span>
                <span className="text-muted-foreground">{formatCurrency(laborRevenue)}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${laborPercentage}%` }}
                />
              </div>
            </div>

            {/* Parts Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Peças</span>
                <span className="text-muted-foreground">{formatCurrency(partsRevenue)}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${partsPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
