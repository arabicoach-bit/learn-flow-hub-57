import { useNavigate } from 'react-router-dom';
import { Edit, Key, UserX, UserCheck, Trash2, MoreVertical, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Teacher } from '@/hooks/use-teachers';
import { TeacherBatchStats } from '@/hooks/use-teachers-batch-stats';
import { formatSalary } from '@/lib/wallet-utils';
import { format, formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';

interface TeacherTableViewProps {
  teachers: Teacher[];
  batchStats: Record<string, TeacherBatchStats> | undefined;
  isLoading: boolean;
  onEdit: (teacher: Teacher) => void;
  onResetPassword: (teacher: Teacher) => void;
  onToggleActive: (teacher: Teacher, activate: boolean) => void;
  onDelete: (teacher: Teacher) => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${cleaned.replace(/^\+/, '')}`;
}

export function TeacherTableView({
  teachers,
  batchStats,
  isLoading,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
}: TeacherTableViewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No teachers found</h3>
        <p className="text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Teacher</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Students</TableHead>
              <TableHead className="text-center hidden md:table-cell">Rate/hr</TableHead>
              <TableHead className="text-center hidden md:table-cell">Monthly Hours</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Monthly Salary</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Last Login</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => {
              const isActive = teacher.is_active !== false;
              const stats = batchStats?.[teacher.teacher_id];
              const wa = whatsappUrl(teacher.phone);

              return (
                <TableRow
                  key={teacher.teacher_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/admin/teachers/${teacher.teacher_id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {getInitials(teacher.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{teacher.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {teacher.email || '-'}
                          </span>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-400 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center hidden sm:table-cell">
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                        {stats?.activeStudents ?? '-'}
                      </Badge>
                      {(stats?.tempStopStudents ?? 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                              {stats?.tempStopStudents}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Temp. stopped students</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center hidden md:table-cell font-medium">
                    {formatSalary(teacher.rate_per_lesson)}
                  </TableCell>

                  <TableCell className="text-center hidden md:table-cell">
                    <span className="font-medium">
                      {stats ? `${(stats.monthlyHours + stats.trialLessons * 0.5).toFixed(1)}h` : '-'}
                    </span>
                    {stats && stats.trialLessons > 0 && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-xs text-muted-foreground ml-1">
                            (+{stats.trialLessons}T)
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{stats.trialLessons} trial lessons</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  <TableCell className="text-center hidden lg:table-cell font-medium text-emerald-600 dark:text-emerald-400">
                    {stats ? formatSalary(stats.monthlySalary) : '-'}
                  </TableCell>

                  <TableCell className="text-center hidden lg:table-cell text-xs text-muted-foreground">
                    {stats?.lastLogin
                      ? formatDistanceToNow(new Date(stats.lastLogin), { addSuffix: true })
                      : 'Never'}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(teacher);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onResetPassword(teacher);
                          }}
                        >
                          <Key className="w-4 h-4 mr-2" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isActive ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleActive(teacher, false);
                            }}
                            className="text-orange-600"
                          >
                            <UserX className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleActive(teacher, true);
                            }}
                            className="text-green-600"
                          >
                            <UserCheck className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(teacher);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
