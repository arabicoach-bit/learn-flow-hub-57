import { useNavigate } from 'react-router-dom';
import { Edit, Key, UserX, UserCheck, Trash2, MoreVertical, MessageCircle, Gift, Users, ArrowUpDown, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Teacher } from '@/hooks/use-teachers';
import { PayrollTeacher } from '@/components/payroll/PayrollTableView';
import { formatSalary } from '@/lib/wallet-utils';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

type SortKey = 'name' | 'students' | 'lessons' | 'hours' | 'salary' | 'totalPay';
type SortDir = 'asc' | 'desc';

interface UnifiedTeacherTableProps {
  teachers: Teacher[];
  payrollMap: Record<string, PayrollTeacher>;
  isLoading: boolean;
  editingBonusId: string | null;
  bonusValue: string;
  onBonusValueChange: (v: string) => void;
  onStartEditBonus: (teacher: PayrollTeacher) => void;
  onSaveBonus: (teacherId: string) => void;
  onCancelEditBonus: () => void;
  onEdit: (teacher: Teacher) => void;
  onResetPassword: (teacher: Teacher) => void;
  onToggleActive: (teacher: Teacher, activate: boolean) => void;
  onDelete: (teacher: Teacher) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${cleaned.replace(/^\+/, '')}`;
}

export function UnifiedTeacherTable({
  teachers,
  payrollMap,
  isLoading,
  editingBonusId,
  bonusValue,
  onBonusValueChange,
  onStartEditBonus,
  onSaveBonus,
  onCancelEditBonus,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
}: UnifiedTeacherTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('totalPay');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTeachers = useMemo(() => {
    const list = [...teachers];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const pa = payrollMap[a.teacher_id];
      const pb = payrollMap[b.teacher_id];
      switch (sortKey) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'students': return dir * ((pa?.active_students ?? 0) - (pb?.active_students ?? 0));
        case 'lessons': return dir * ((pa?.lessons_taken ?? 0) - (pb?.lessons_taken ?? 0));
        case 'hours': return dir * ((pa?.total_hours ?? 0) - (pb?.total_hours ?? 0));
        case 'salary': return dir * ((pa?.salary_earned ?? 0) - (pb?.salary_earned ?? 0));
        case 'totalPay': return dir * ((pa?.total_pay ?? 0) - (pb?.total_pay ?? 0));
        default: return 0;
      }
    });
    return list;
  }, [teachers, payrollMap, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No teachers found</h3>
        <p className="text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  const totals = Object.values(payrollMap).reduce(
    (acc, t) => ({
      lessons: acc.lessons + t.lessons_taken,
      hours: acc.hours + t.total_hours,
      salary: acc.salary + t.salary_earned,
      bonus: acc.bonus + t.bonus,
      totalPay: acc.totalPay + t.total_pay,
      active: acc.active + t.active_students,
    }),
    { lessons: 0, hours: 0, salary: 0, bonus: 0, totalPay: 0, active: 0 },
  );

  const SortableHead = ({ label, sortId, className = '' }: { label: string; sortId: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => toggleSort(sortId)}
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === sortId ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </button>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableHead label="Teacher" sortId="name" />
              <TableHead className="text-center">Status</TableHead>
              <SortableHead label="Students" sortId="students" className="text-center hidden sm:table-cell" />
              <TableHead className="text-center hidden sm:table-cell">Rate/hr</TableHead>
              <SortableHead label="Lessons" sortId="lessons" className="text-center" />
              <SortableHead label="Hours" sortId="hours" className="text-center hidden md:table-cell" />
              <SortableHead label="Salary" sortId="salary" className="text-center" />
              <TableHead className="text-center hidden md:table-cell">Bonus</TableHead>
              <SortableHead label="Total Pay" sortId="totalPay" className="text-center" />
              <TableHead className="text-center hidden lg:table-cell">Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeachers.map((teacher) => {
              const isActive = teacher.is_active !== false;
              const pr = payrollMap[teacher.teacher_id];
              const wa = whatsappUrl(teacher.phone);

              return (
                <TableRow
                  key={teacher.teacher_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {getInitials(teacher.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{teacher.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground truncate">{teacher.email || '-'}</span>
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400" onClick={(e) => e.stopPropagation()}>
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                        {pr?.active_students ?? '-'}
                      </Badge>
                      {(pr?.temp_stop_students ?? 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                              {pr?.temp_stop_students}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Temp. stopped</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center hidden sm:table-cell font-medium">
                    {formatSalary(teacher.rate_per_lesson)}
                  </TableCell>

                  <TableCell className="text-center font-medium">
                    {pr?.lessons_taken ?? '-'}
                  </TableCell>

                  <TableCell className="text-center hidden md:table-cell font-medium">
                    {pr ? `${pr.total_hours.toFixed(1)}h` : '-'}
                  </TableCell>

                  <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                    {pr ? formatSalary(pr.salary_earned) : '-'}
                  </TableCell>

                  <TableCell className="text-center hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                    {pr && editingBonusId === teacher.teacher_id ? (
                      <div className="flex items-center gap-1 min-w-[140px] justify-center">
                        <Input
                          type="number"
                          value={bonusValue}
                          onChange={(e) => onBonusValueChange(e.target.value)}
                          placeholder="EGP"
                          className="h-7 w-20 text-xs"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onSaveBonus(teacher.teacher_id)}>✓</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancelEditBonus}>✗</Button>
                      </div>
                    ) : pr && pr.bonus > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            onClick={() => onStartEditBonus(pr)}
                          >
                            {formatSalary(pr.bonus)}
                            <Gift className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {pr.bonus_notes ? <span>{pr.bonus_notes}</span> : <span className="text-muted-foreground italic">No notes</span>}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                        onClick={() => pr && onStartEditBonus(pr)}
                      >
                        —
                        <Gift className="w-3 h-3" />
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="text-center font-bold text-primary">
                    {pr ? formatSalary(pr.total_pay) : '-'}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(teacher); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetPassword(teacher); }}>
                          <Key className="w-4 h-4 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isActive ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(teacher, false); }} className="text-orange-600">
                            <UserX className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(teacher, true); }} className="text-green-600">
                            <UserCheck className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(teacher); }} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold bg-muted/30">
              <TableCell>Totals ({teachers.length})</TableCell>
              <TableCell />
              <TableCell className="text-center hidden sm:table-cell">{totals.active}</TableCell>
              <TableCell className="hidden sm:table-cell" />
              <TableCell className="text-center">{totals.lessons}</TableCell>
              <TableCell className="text-center hidden md:table-cell">{totals.hours.toFixed(1)}h</TableCell>
              <TableCell className="text-center text-emerald-600 dark:text-emerald-400">{formatSalary(totals.salary)}</TableCell>
              <TableCell className="text-center hidden md:table-cell text-amber-600 dark:text-amber-400">{formatSalary(totals.bonus)}</TableCell>
              <TableCell className="text-center text-primary">{formatSalary(totals.totalPay)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TooltipProvider>
  );
}
