import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useStudentStats } from '@/hooks/use-admin-dashboard-stats';
import { formatCurrency } from '@/lib/wallet-utils';
import { 
  GraduationCap, 
  AlertTriangle, 
  Ban, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Wallet
} from 'lucide-react';

export function StudentStatsSection() {
  const { data: stats, isLoading } = useStudentStats();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Student Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const totalStudents = stats.totalStudents || 1; // Prevent division by zero

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Student Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Students */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </div>

          {/* Active Students */}
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold">{stats.activeStudents}</p>
            <p className="text-xs text-muted-foreground">
              {((stats.activeStudents / totalStudents) * 100).toFixed(0)}% of total
            </p>
          </div>

          {/* Temporary stop */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Temporary stop</span>
            </div>
            <p className="text-2xl font-bold">{stats.graceStudents}</p>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </div>

          {/* Left */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <Ban className="w-4 h-4" />
              <span className="text-sm font-medium">Left</span>
            </div>
            <p className="text-2xl font-bold">{stats.blockedStudents}</p>
            <p className="text-xs text-muted-foreground">No lessons</p>
          </div>
        </div>

        {/* Payment Status Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            💰 Payment Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Paid */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Paid</span>
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {stats.paidStudents}
                </Badge>
              </div>
              <Progress value={(stats.paidStudents / totalStudents) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.paidStudents / totalStudents) * 100).toFixed(0)}% of students
              </p>
            </div>

            {/* Due Soon */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Due Soon</span>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {stats.dueSoonStudents}
                </Badge>
              </div>
              <Progress value={(stats.dueSoonStudents / totalStudents) * 100} className="h-2 [&>div]:bg-amber-500" />
              <p className="text-xs text-muted-foreground mt-1">
                Renewal needed this week
              </p>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overdue</span>
                <Badge variant="destructive">
                  {stats.overdueStudents}
                </Badge>
              </div>
              <Progress value={(stats.overdueStudents / totalStudents) * 100} className="h-2 [&>div]:bg-red-500" />
              <p className="text-xs text-muted-foreground mt-1">
                Payment required
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            📊 Financial Overview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">Monthly Revenue</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(stats.totalMonthlyRevenue)}</p>
              <p className="text-xs text-muted-foreground">From active packages</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Outstanding Balance</span>
              </div>
              <p className="text-xl font-bold text-red-600">{stats.totalOutstandingBalance} lessons</p>
              <p className="text-xs text-muted-foreground">Debt across all students</p>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Avg. Monthly Fee</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(stats.averageMonthlyFee)}</p>
              <p className="text-xs text-muted-foreground">Per active student</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
