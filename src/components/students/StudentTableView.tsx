import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pencil, Trash2, MessageCircle, ChevronRight,
} from 'lucide-react';
import { getStatusBadgeClass, getStatusDisplayLabel, getPaymentStatus, getPaymentStatusBadgeClass } from '@/lib/wallet-utils';
import { WalletBadge } from '@/components/shared/WalletBadge';
import { LessonsBadge } from '@/components/shared/LessonsBadge';
import { useUpdateStudent, type Student } from '@/hooks/use-students';
import { useToast } from '@/hooks/use-toast';
import type { StudentBatchStats } from '@/hooks/use-students-batch-stats';

interface StudentTableViewProps {
  students: Student[];
  batchStats: Record<string, StudentBatchStats>;
  isLoading: boolean;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function getRowHighlight(student: Student) {
  if (student.status === 'Left') return 'bg-red-500/5 hover:bg-red-500/10';
  if (student.status === 'Temporary Stop') return 'bg-amber-500/5 hover:bg-amber-500/10';
  if (student.status === 'Active' && (student.wallet_balance || 0) <= 2) return 'bg-orange-500/5 hover:bg-orange-500/10';
  return 'hover:bg-muted/50';
}

export function StudentTableView({
  students, batchStats, isLoading, onEdit, onDelete,
  page, pageSize, totalCount, onPageChange,
}: StudentTableViewProps) {
  const navigate = useNavigate();
  const updateStudent = useUpdateStudent();
  const { toast } = useToast();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-7 px-2"></th>
              <th>Student</th>
              <th>Teacher</th>
              {/* Status group */}
              <th className="border-l border-border/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Status</span>
              </th>
              <th>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Wallet</span>
              </th>
              <th>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Lessons</span>
              </th>
              <th className="border-r border-border/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Next Lesson</span>
              </th>
              {/* Package group */}
              <th className="border-l border-border/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Packages</span>
              </th>
              <th className="border-r border-border/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Payment</span>
              </th>
              <th className="text-right w-[90px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={10}><Skeleton className="h-8 w-full" /></td></tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No students found</td></tr>
            ) : (
              students.map((student) => {
                const wallet = student.wallet_balance || 0;
                const stats = batchStats[student.student_id];
                const paymentStatus = getPaymentStatus(student.status, wallet, stats?.hasAnyPendingPackage ?? false);

                return (
                  <tr
                    key={student.student_id}
                    className={`cursor-pointer transition-colors ${getRowHighlight(student)}`}
                    onClick={() => navigate(`/admin/students/${student.student_id}`)}
                  >
                    <td className="w-7 px-2 py-2">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">{student.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-sm truncate">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="text-sm text-muted-foreground">{student.teachers?.name || '—'}</span>
                    </td>

                    {/* Status group */}
                    <td className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <StudentStatusSelect
                          value={student.status}
                          onValueChange={(value) => {
                            updateStudent.mutate(
                              { studentId: student.student_id, status: value },
                              {
                                onSuccess: () => toast({ title: `Status updated to ${getStatusDisplayLabel(value)}` }),
                                onError: () => toast({ title: 'Failed to update status', variant: 'destructive' }),
                              }
                            );
                          }}
                        >
                          <SelectTrigger className="w-[95px] h-6 text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                            <Badge variant="outline" className={`${getStatusBadgeClass(student.status)} border-0 text-[11px] px-1.5 py-0`}>
                              {getStatusDisplayLabel(student.status)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">
                              <Badge variant="outline" className={getStatusBadgeClass('Active')}>Active</Badge>
                            </SelectItem>
                            <SelectItem value="Temporary Stop">
                              <Badge variant="outline" className={getStatusBadgeClass('Temporary Stop')}>Stop</Badge>
                            </SelectItem>
                            <SelectItem value="Left">
                              <Badge variant="outline" className={getStatusBadgeClass('Left')}>Left</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-muted-foreground/70 pl-0.5">
                          {student.status === 'Active'
                            ? student.created_at ? format(new Date(student.created_at), 'dd MMM yyyy') : '—'
                            : student.updated_at ? format(new Date(student.updated_at), 'dd MMM yyyy') : '—'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="py-2">
                      <WalletBadge balance={wallet} />
                    </td>
                    <td className="py-2" onClick={e => e.stopPropagation()}>
                      {stats ? (
                        <LessonsBadge used={stats.lessonsUsed} total={stats.lessonsTotal} />
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">
                        {stats?.nextLessonDate
                          ? format(new Date(`${stats.nextLessonDate}T${stats.nextLessonTime || '00:00'}`), 'dd MMM · HH:mm')
                          : '—'}
                      </span>
                    </td>

                    {/* Package group */}
                    <td className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{stats?.inProgressPackages ?? '—'}</span>
                        <span className="text-muted-foreground text-[10px]">/</span>
                        <span className="text-xs text-muted-foreground">{stats?.finishedPackages ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                      {paymentStatus ? (
                        <Badge variant="outline" className={`${getPaymentStatusBadgeClass(paymentStatus)} text-[11px] px-1.5 py-0`}>
                          {paymentStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    <td className="text-right py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-0.5 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const phone = student.phone?.replace(/[^0-9]/g, '');
                          if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                        }}>
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(student)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(student)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => onPageChange(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}
