import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherMonthlyStats } from '@/hooks/use-teacher-dashboard';
import { Wallet, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { formatSalary } from '@/lib/wallet-utils';

export function TeacherSalaryCard() {
  const { data: stats, isLoading } = useTeacherMonthlyStats();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            Salary Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const { currentMonth, lastMonth } = stats || { currentMonth: null, lastMonth: null };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-500" />
          Salary Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Month */}
        <div className="border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-500/5 rounded-r-lg">
          <h3 className="font-bold text-lg mb-3">
            This Month ({currentMonth?.month || 'Current'})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Lessons</p>
                <p className="text-xl font-bold">{currentMonth?.lessons_taught || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="text-xl font-bold">{currentMonth?.total_hours?.toFixed(1) || 0}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">
                Rate: {formatSalary(currentMonth?.rate_per_lesson || 0)}/hour
              </p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatSalary(currentMonth?.salary_earned || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Last Month */}
        <div className="border-l-4 border-muted pl-4 py-2 bg-muted/10 rounded-r-lg">
          <h3 className="font-bold text-lg mb-3 text-muted-foreground">
            Last Month ({lastMonth?.month || 'Previous'})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Lessons</p>
                <p className="text-lg font-semibold">{lastMonth?.lessons_taught || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="text-lg font-semibold">{lastMonth?.total_hours?.toFixed(1) || 0}</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Rate: {formatSalary(lastMonth?.rate_per_lesson || 0)}/hour
            </p>
            <p className="text-2xl font-bold text-muted-foreground">
              {formatSalary(lastMonth?.salary_earned || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
