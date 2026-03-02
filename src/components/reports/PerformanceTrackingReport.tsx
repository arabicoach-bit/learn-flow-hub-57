import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePerformanceStats } from '@/hooks/use-performance-stats';
import { formatCurrency } from '@/lib/wallet-utils';
import {
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
  BookOpen,
  Wallet,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, AreaChart, Area } from 'recharts';

const chartConfig = {
  newPackages: { label: 'New Packages', color: 'hsl(var(--primary))' },
  renewals: { label: 'Renewals', color: 'hsl(var(--chart-3))' },
  totalRevenue: { label: 'Revenue', color: 'hsl(var(--chart-4))' },
  lessonsDelivered: { label: 'Lessons', color: 'hsl(var(--chart-2))' },
  newStudents: { label: 'New Students', color: 'hsl(var(--chart-5))' },
};

interface TrendBadgeProps {
  value: number;
  suffix?: string;
}

function TrendBadge({ value, suffix = '%' }: TrendBadgeProps) {
  const isPositive = value >= 0;
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${isPositive ? 'text-green-600 border-green-600' : 'text-destructive border-destructive'}`}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
    </Badge>
  );
}

interface PerformanceTrackingReportProps {
  startDate: string | null;
  endDate: string | null;
}

export function PerformanceTrackingReport({ startDate, endDate }: PerformanceTrackingReportProps) {
  const { data: stats, isLoading } = usePerformanceStats(startDate, endDate);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!stats) return null;

  const { currentPeriod, trend, periodData, isAllTime } = stats;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              {!isAllTime && <TrendBadge value={trend.revenue} />}
            </div>
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(currentPeriod.totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-chart-3/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-chart-3" />
              </div>
              {!isAllTime && <TrendBadge value={trend.packages} />}
            </div>
            <p className="text-sm text-muted-foreground">Packages</p>
            <p className="text-2xl font-bold">
              {currentPeriod.newPackages + currentPeriod.renewals}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({currentPeriod.newPackages} new, {currentPeriod.renewals} renewals)
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-chart-5/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-chart-5" />
              </div>
              {!isAllTime && <TrendBadge value={trend.students} />}
            </div>
            <p className="text-sm text-muted-foreground">New Students</p>
            <p className="text-2xl font-bold">{currentPeriod.newStudents}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-chart-2" />
              </div>
              {!isAllTime && <TrendBadge value={trend.lessons} />}
            </div>
            <p className="text-sm text-muted-foreground">Lessons Delivered</p>
            <p className="text-2xl font-bold">{currentPeriod.lessonsDelivered}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Packages</p>
                <p className="text-xl font-bold">{currentPeriod.completedPackages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial Lessons</p>
                <p className="text-xl font-bold">{currentPeriod.trialLessons}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold">{currentPeriod.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={periodData}>
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="totalRevenue" stroke="var(--color-totalRevenue)" fill="var(--color-totalRevenue)" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Packages Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={periodData}>
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newPackages" fill="var(--color-newPackages)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="renewals" fill="var(--color-renewals)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Lessons Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={periodData}>
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="lessonsDelivered" stroke="var(--color-lessonsDelivered)" strokeWidth={2} dot={{ fill: 'var(--color-lessonsDelivered)', r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">New Students</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={periodData}>
                <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newStudents" fill="var(--color-newStudents)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
