import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackageStats } from '@/hooks/use-package-stats';
import { formatCurrency } from '@/lib/wallet-utils';
import { Package, TrendingUp, RefreshCw, DollarSign, BarChart3, Percent } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const chartConfig = {
  newPackages: {
    label: 'New Packages',
    color: 'hsl(var(--primary))',
  },
  completedPackages: {
    label: 'Completed',
    color: 'hsl(var(--chart-2))',
  },
  renewals: {
    label: 'Renewals',
    color: 'hsl(var(--chart-3))',
  },
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-4))',
  },
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function PackageStatsReport() {
  const { data: stats, isLoading } = usePackageStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!stats) return null;

  const statusData = [
    { name: 'Active', value: stats.activePackages },
    { name: 'Completed', value: stats.completedPackages },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Packages</p>
                <p className="text-3xl font-bold">{stats.totalPackages}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activePackages} active • {stats.completedPackages} completed
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of all packages completed
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Renewal Rate</p>
                <p className="text-3xl font-bold">{stats.renewalRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalRenewals} total renewals
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  from all packages
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Package Value</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.averagePackageValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  per package
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-chart-5/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Lessons/Package</p>
                <p className="text-3xl font-bold">{stats.averageLessonsPerPackage.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  lessons per package
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Packages Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Package Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={stats.monthlyStats}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="newPackages" fill="var(--color-newPackages)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedPackages" fill="var(--color-completedPackages)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="renewals" fill="var(--color-renewals)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={stats.monthlyStats}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-revenue)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-revenue)', r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Package Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Package Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Renewal vs New Packages */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">New vs Renewal Packages</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={stats.monthlyStats}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="newPackages" 
                  fill="var(--color-newPackages)" 
                  radius={[4, 4, 0, 0]}
                  name="New"
                />
                <Bar 
                  dataKey="renewals" 
                  fill="var(--color-renewals)" 
                  radius={[4, 4, 0, 0]}
                  name="Renewals"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
