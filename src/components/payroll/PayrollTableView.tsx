import { useNavigate } from 'react-router-dom';
import { Gift, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatSalary } from '@/lib/wallet-utils';

export interface PayrollTeacher {
  teacher_id: string;
  teacher_name: string;
  email: string | null;
  lessons_taken: number;
  total_hours: number;
  rate_per_lesson: number;
  salary_earned: number;
  bonus: number;
  bonus_notes: string | null;
  total_pay: number;
  active_students: number;
  temp_stop_students: number;
  left_students: number;
  trial_lessons: number;
  last_login: string | null;
}

interface PayrollTableViewProps {
  data: PayrollTeacher[];
  isLoading: boolean;
  editingBonusId: string | null;
  bonusValue: string;
  onBonusValueChange: (v: string) => void;
  onStartEditBonus: (teacher: PayrollTeacher) => void;
  onSaveBonus: (teacherId: string) => void;
  onCancelEditBonus: () => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function PayrollTableView({
  data,
  isLoading,
  editingBonusId,
  bonusValue,
  onBonusValueChange,
  onStartEditBonus,
  onSaveBonus,
  onCancelEditBonus,
}: PayrollTableViewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No data for this period</h3>
        <p className="text-muted-foreground">Try selecting a different month or year</p>
      </div>
    );
  }

  // Totals
  const totals = data.reduce(
    (acc, t) => ({
      lessons: acc.lessons + t.lessons_taken,
      hours: acc.hours + t.total_hours,
      salary: acc.salary + t.salary_earned,
      bonus: acc.bonus + t.bonus,
      totalPay: acc.totalPay + t.total_pay,
      active: acc.active + t.active_students,
      tempStop: acc.tempStop + t.temp_stop_students,
      left: acc.left + t.left_students,
    }),
    { lessons: 0, hours: 0, salary: 0, bonus: 0, totalPay: 0, active: 0, tempStop: 0, left: 0 },
  );

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Teacher</TableHead>
            <TableHead className="text-center hidden sm:table-cell">Rate/hr</TableHead>
            <TableHead className="text-center">Lessons</TableHead>
            <TableHead className="text-center hidden md:table-cell">Hours</TableHead>
            <TableHead className="text-center">Salary</TableHead>
            <TableHead className="text-center">Bonus</TableHead>
            <TableHead className="text-center">Total Pay</TableHead>
            <TableHead className="text-center hidden lg:table-cell">Active</TableHead>
            <TableHead className="text-center hidden lg:table-cell">Temp.</TableHead>
            <TableHead className="text-center hidden lg:table-cell">Left</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((teacher) => (
            <TableRow
              key={teacher.teacher_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                    {getInitials(teacher.teacher_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{teacher.teacher_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{teacher.email || '-'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center hidden sm:table-cell">
                {formatSalary(teacher.rate_per_lesson)}
              </TableCell>
              <TableCell className="text-center font-medium">{teacher.lessons_taken}</TableCell>
              <TableCell className="text-center font-medium hidden md:table-cell">
                {teacher.total_hours.toFixed(1)}h
              </TableCell>
              <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                {formatSalary(teacher.salary_earned)}
              </TableCell>
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                {editingBonusId === teacher.teacher_id ? (
                  <div className="flex items-center gap-1 min-w-[140px] justify-center">
                    <Input
                      type="number"
                      value={bonusValue}
                      onChange={(e) => onBonusValueChange(e.target.value)}
                      placeholder="EGP"
                      className="h-7 w-20 text-xs"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onSaveBonus(teacher.teacher_id)}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={onCancelEditBonus}
                    >
                      ✗
                    </Button>
                  </div>
                ) : (
                  <button
                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    onClick={() => onStartEditBonus(teacher)}
                  >
                    {teacher.bonus > 0 ? formatSalary(teacher.bonus) : '—'}
                    <Gift className="w-3 h-3" />
                  </button>
                )}
              </TableCell>
              <TableCell className="text-center font-bold text-primary">
                {formatSalary(teacher.total_pay)}
              </TableCell>
              <TableCell className="text-center hidden lg:table-cell">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  {teacher.active_students}
                </Badge>
              </TableCell>
              <TableCell className="text-center hidden lg:table-cell">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  {teacher.temp_stop_students}
                </Badge>
              </TableCell>
              <TableCell className="text-center hidden lg:table-cell">
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30">
                  {teacher.left_students}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-bold bg-muted/30">
            <TableCell>Totals ({data.length} teachers)</TableCell>
            <TableCell className="hidden sm:table-cell" />
            <TableCell className="text-center">{totals.lessons}</TableCell>
            <TableCell className="text-center hidden md:table-cell">{totals.hours.toFixed(1)}h</TableCell>
            <TableCell className="text-center text-emerald-600 dark:text-emerald-400">
              {formatSalary(totals.salary)}
            </TableCell>
            <TableCell className="text-center text-amber-600 dark:text-amber-400">
              {formatSalary(totals.bonus)}
            </TableCell>
            <TableCell className="text-center text-primary">{formatSalary(totals.totalPay)}</TableCell>
            <TableCell className="text-center hidden lg:table-cell">{totals.active}</TableCell>
            <TableCell className="text-center hidden lg:table-cell">{totals.tempStop}</TableCell>
            <TableCell className="text-center hidden lg:table-cell">{totals.left}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
