import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTeacherPerformance } from '@/hooks/use-admin-dashboard-stats';
import { formatSalary } from '@/lib/wallet-utils';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  TrendingUp,
  Award,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

function getPerformanceBadgeClass(rating: string): string {
  switch (rating) {
    case 'Excellent':
      return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'Good':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
    case 'Average':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'Poor':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function TeacherPerformanceSection() {
  const navigate = useNavigate();
  const { data: teachers, isLoading } = useTeacherPerformance();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!teachers || teachers.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No teachers found</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = teachers.reduce(
    (acc, t) => ({
      totalHours: acc.totalHours + t.totalTeachingHours,
      totalSalary: acc.totalSalary + t.salary,
      totalStudents: acc.totalStudents + t.activeStudents,
      totalBonus: acc.totalBonus + t.bonus,
    }),
    { totalHours: 0, totalSalary: 0, totalStudents: 0, totalBonus: 0 }
  );

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display flex items-center gap-2">
          <Users className="w-5 h-5" />
          Teacher Performance - {currentMonth}
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {teachers.length} Teachers
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Total Hours</span>
            </div>
            <p className="text-xl font-bold">{totals.totalHours.toFixed(1)}h</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Total Salary</span>
            </div>
            <p className="text-xl font-bold">{formatSalary(totals.totalSalary)}</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Active Students</span>
            </div>
            <p className="text-xl font-bold">{totals.totalStudents}</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-xs font-medium">Total Bonus</span>
            </div>
            <p className="text-xl font-bold">{formatSalary(totals.totalBonus)}</p>
          </div>
        </div>

        {/* Performance Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Teacher</TableHead>
                <TableHead className="text-center">Rate/hr</TableHead>
                <TableHead className="text-center">Hours</TableHead>
                <TableHead className="text-center">Salary</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Retention</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Bonus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow 
                  key={teacher.teacher_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{teacher.email || '-'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatSalary(teacher.rate_per_lesson)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {teacher.totalTeachingHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {formatSalary(teacher.salary)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{teacher.activeStudents}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={
                      teacher.retentionRate >= 90 
                        ? 'text-emerald-600' 
                        : teacher.retentionRate >= 70 
                          ? 'text-amber-600' 
                          : 'text-red-600'
                    }>
                      {teacher.retentionRate.toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={getPerformanceBadgeClass(teacher.performanceRating)}
                    >
                      {teacher.performanceRating === 'Excellent' && <Star className="w-3 h-3 mr-1" />}
                      {teacher.performanceRating}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {teacher.bonus > 0 ? (
                      <span className="text-emerald-600">{formatSalary(teacher.bonus)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer totals */}
        <div className="flex justify-end">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Quarter Total: </span>
            {formatSalary(totals.totalSalary + totals.totalBonus)} (incl. bonus)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
