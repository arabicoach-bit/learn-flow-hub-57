import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Calendar, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatSalary } from '@/lib/wallet-utils';

interface PayrollRecord {
  payroll_id: string;
  period_start: string;
  period_end: string;
  lessons_taken: number | null;
  rate_per_lesson: number;
  amount_due: number;
  status: 'Draft' | 'Approved' | 'Paid' | null;
}

export default function TeacherPayroll() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  const { data: payrollRecords, isLoading } = useQuery({
    queryKey: ['teacher-payroll', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('teachers_payroll')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      return data as PayrollRecord[];
    },
    enabled: !!teacherId,
  });

  // Calculate current month estimate
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  const { data: lessonsThisMonth } = useQuery({
    queryKey: ['lessons-this-month', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, duration_minutes')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed')
        .gte('scheduled_date', currentMonthStart)
        .lte('scheduled_date', currentMonthEnd);
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });

  const { data: teacher } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('rate_per_lesson')
        .eq('teacher_id', teacherId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });

  const lessonsCount = lessonsThisMonth?.length || 0;
  const ratePerLesson = teacher?.rate_per_lesson || 0;
  const totalHours = (lessonsThisMonth || []).reduce((sum, l) => sum + ((l as any).duration_minutes || 45) / 60, 0);
  const estimatedEarnings = totalHours * ratePerLesson;

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'Paid':
        return 'status-active';
      case 'Approved':
        return 'status-new';
      case 'Draft':
      default:
        return 'status-grace';
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Payroll</h1>
          <p className="text-muted-foreground">View your earnings and payment history</p>
        </div>

        {/* Current Month Estimate */}
        <Card className="glass-card border-emerald-600/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Current Month Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <p className="text-sm text-muted-foreground mb-1">Lessons This Month</p>
                  <p className="text-3xl font-bold text-emerald-400">{lessonsCount}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Rate per Hour</p>
                  <p className="text-3xl font-bold">{formatSalary(ratePerLesson)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatSalary(estimatedEarnings)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Payroll History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : payrollRecords && payrollRecords.length > 0 ? (
              <div className="space-y-3">
                {payrollRecords.map((record) => (
                  <div
                    key={record.payroll_id}
                    className="p-4 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">
                            {format(new Date(record.period_start), 'MMM d')} - {format(new Date(record.period_end), 'MMM d, yyyy')}
                          </p>
                          <Badge variant="outline" className={getStatusBadgeClass(record.status)}>
                            {record.status || 'Draft'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {record.lessons_taken || 0} lessons × {formatSalary(record.rate_per_lesson)}/hour
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">{formatSalary(record.amount_due)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No payroll records yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
