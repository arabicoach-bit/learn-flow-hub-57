import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit, Key, UserX, UserCheck, Trash2, MoreVertical, MessageCircle, Users, Clock, Wallet, BookOpen,
} from 'lucide-react';
import { Teacher } from '@/hooks/use-teachers';
import { PayrollTeacher } from '@/components/payroll/PayrollTableView';
import { formatSalary } from '@/lib/wallet-utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TeacherCardViewProps {
  teachers: Teacher[];
  payrollMap: Record<string, PayrollTeacher>;
  isLoading: boolean;
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

export function TeacherCardView({
  teachers,
  payrollMap,
  isLoading,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
}: TeacherCardViewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teachers.map((teacher) => {
        const isActive = teacher.is_active !== false;
        const pr = payrollMap[teacher.teacher_id];
        const wa = whatsappUrl(teacher.phone);

        return (
          <Card
            key={teacher.teacher_id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
          >
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {getInitials(teacher.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate group-hover:text-primary transition-colors">
                      {teacher.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        {teacher.email || '-'}
                      </span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400" onClick={(e) => e.stopPropagation()}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
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
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mx-auto mb-0.5" />
                  <p className="text-base font-bold">{pr?.active_students ?? '-'}</p>
                  <p className="text-[9px] text-muted-foreground">Students</p>
                </div>
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-center">
                  <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400 mx-auto mb-0.5" />
                  <p className="text-base font-bold">{pr?.lessons_taken ?? '-'}</p>
                  <p className="text-[9px] text-muted-foreground">Lessons</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 mx-auto mb-0.5" />
                  <p className="text-base font-bold">{pr ? `${pr.total_hours.toFixed(1)}` : '-'}</p>
                  <p className="text-[9px] text-muted-foreground">Hours</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <Wallet className="w-3 h-3 text-amber-600 dark:text-amber-400 mx-auto mb-0.5" />
                  <p className="text-base font-bold">{pr ? formatSalary(pr.total_pay) : '-'}</p>
                  <p className="text-[9px] text-muted-foreground">Total Pay</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Rate: {formatSalary(teacher.rate_per_lesson)}/hr</span>
                {pr && pr.bonus > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Bonus: {formatSalary(pr.bonus)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
