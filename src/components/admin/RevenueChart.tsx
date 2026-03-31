import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { month: 'm1', revenue: 4200 },
  { month: 'm2', revenue: 3800 },
  { month: 'm3', revenue: 5100 },
  { month: 'm4', revenue: 4600 },
  { month: 'm5', revenue: 5900 },
  { month: 'm6', revenue: 6300 },
  { month: 'm7', revenue: 5800 },
  { month: 'm8', revenue: 7100 },
  { month: 'm9', revenue: 6600 },
  { month: 'm10', revenue: 7800 },
  { month: 'm11', revenue: 8200 },
  { month: 'm12', revenue: 9100 },
];

function formatCurrency(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueChart() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">
          {t('dashboard.revenueTrend.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(key) => t(`dashboard.months.${key}`)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontSize: 14,
              }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(value) => [
                formatCurrency(Number(value) || 0, locale, 'VND'),
                t('dashboard.revenueTrend.label'),
              ]}
              labelFormatter={(label) => t(`dashboard.months.${label}`)}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
