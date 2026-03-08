import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import type { MonthlyStats } from '@/hooks/use-quarter-analysis';

interface Props {
  monthlyBreakdown: MonthlyStats[];
}

const revenueConfig = {
  paidRevenue: { label: 'Revenue (AED)', color: 'hsl(var(--primary))' },
  newPackages: { label: 'New Packages', color: 'hsl(142 76% 36%)' },
  renewals: { label: 'Renewals', color: 'hsl(45 93% 47%)' },
};

const lessonsConfig = {
  completedLessons: { label: 'Completed', color: 'hsl(142 76% 36%)' },
  absentLessons: { label: 'Absent', color: 'hsl(0 84% 60%)' },
  scheduledLessons: { label: 'Scheduled', color: 'hsl(217 91% 60%)' },
};

const growthConfig = {
  newStudents: { label: 'New Students', color: 'hsl(217 91% 60%)' },
  trialLessons: { label: 'Trial Lessons', color: 'hsl(280 67% 60%)' },
  trialConversions: { label: 'Conversions', color: 'hsl(142 76% 36%)' },
};

export function QuarterCharts({ monthlyBreakdown }: Props) {
  if (!monthlyBreakdown.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Chart */}
      <Card className="glass-card border-l-4 border-l-emerald-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">💰 Revenue & Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-[220px] w-full">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="paidRevenue" fill="var(--color-paidRevenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
            {monthlyBreakdown.map(m => (
              <div key={m.monthLabel} className="text-center">
                <div className="font-medium">{m.newPackages} new</div>
                <div>{m.renewals} renewals</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lessons Chart */}
      <Card className="glass-card border-l-4 border-l-violet-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">📚 Lessons Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lessonsConfig} className="h-[220px] w-full">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="completedLessons" fill="var(--color-completedLessons)" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="absentLessons" fill="var(--color-absentLessons)" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="scheduledLessons" fill="var(--color-scheduledLessons)" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Growth Chart */}
      <Card className="glass-card border-l-4 border-l-blue-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">📈 Growth & Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={growthConfig} className="h-[220px] w-full">
            <LineChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="newStudents" stroke="var(--color-newStudents)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="trialLessons" stroke="var(--color-trialLessons)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="trialConversions" stroke="var(--color-trialConversions)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
