import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Pencil, Trash2, MessageCircle, ChevronRight, User, Phone,
  Calendar, Package, CreditCard, GraduationCap,
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

export function StudentTableView({
  students, batchStats, isLoading, onEdit, onDelete,
  page, pageSize, totalCount, onPageChange,
}: StudentTableViewProps) {
  const navigate = useNavigate();
  const updateStudent = useUpdateStudent();
  const { toast } = useToast();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>Student</th>
              <th>Teacher</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Lessons</th>
              <th>Next Lesson</th>
              <th>Packages</th>
              <th>Payment</th>
              <th className="text-right">Actions</th>
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
                const isExpanded = expandedIds.has(student.student_id);
                const isLowCredit = student.status === 'Active' && wallet <= 2;

                return (
                  <Collapsible key={student.student_id} open={isExpanded} onOpenChange={() => toggleExpand(student.student_id)} asChild>
                    <>
                      {/* Main Row */}
                      <tr
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${isLowCredit ? 'bg-amber-500/5' : ''}`}
                        onClick={() => toggleExpand(student.student_id)}
                      >
                        <td className="w-8 pr-0">
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">{student.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm truncate block">{student.name}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-muted-foreground">{student.teachers?.name || '—'}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Select
                            value={student.status}
                            onValueChange={(value: 'Active' | 'Temporary Stop' | 'Left') => {
                              updateStudent.mutate(
                                { studentId: student.student_id, status: value },
                                {
                                  onSuccess: () => toast({ title: `Status updated to ${getStatusDisplayLabel(value)}` }),
                                  onError: () => toast({ title: 'Failed to update status', variant: 'destructive' }),
                                }
                              );
                            }}
                          >
                            <SelectTrigger className="w-[100px] h-7 text-xs border-0 bg-transparent px-1">
                              <Badge variant="outline" className={`${getStatusBadgeClass(student.status)} border-0 text-[11px]`}>
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
                        </td>
                        <td>
                          <WalletBadge balance={wallet} />
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {stats ? (
                            <LessonsBadge used={stats.lessonsUsed} total={stats.lessonsTotal} />
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">
                            {stats?.nextLessonDate
                              ? format(new Date(`${stats.nextLessonDate}T${stats.nextLessonTime || '00:00'}`), 'dd MMM · HH:mm')
                              : '—'}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{stats?.inProgressPackages ?? '—'}</span>
                            <span className="text-muted-foreground text-[10px]">/</span>
                            <span className="text-xs text-muted-foreground">{stats?.finishedPackages ?? '—'}</span>
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {paymentStatus ? (
                            <Badge variant="outline" className={`${getPaymentStatusBadgeClass(paymentStatus)} text-[11px]`}>
                              {paymentStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right" onClick={e => e.stopPropagation()}>
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

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={10} className="p-0">
                            <CollapsibleContent forceMount className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                              <div className="px-6 py-4 border-t border-border/30">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {/* Contact Info */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contact</p>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Phone className="w-3 h-3 text-muted-foreground" />
                                        <span>{student.phone}</span>
                                      </div>
                                      {student.parent_guardian_name && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <User className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{student.parent_guardian_name}</span>
                                        </div>
                                      )}
                                      {student.parent_phone && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <Phone className="w-3 h-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{student.parent_phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Academic Info */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Academic</p>
                                    <div className="space-y-1.5">
                                      {student.programs?.name && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <GraduationCap className="w-3 h-3 text-muted-foreground" />
                                          <span>{student.programs.name}</span>
                                        </div>
                                      )}
                                      {student.student_level && (
                                        <p className="text-sm text-muted-foreground">Level: {student.student_level}</p>
                                      )}
                                      {student.year_group && (
                                        <p className="text-sm text-muted-foreground">Year: {student.year_group}</p>
                                      )}
                                      {student.school && (
                                        <p className="text-sm text-muted-foreground">{student.school}</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Package Summary */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Packages</p>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Package className="w-3 h-3 text-muted-foreground" />
                                        <span>{stats?.inProgressPackages ?? 0} in progress</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Package className="w-3 h-3" />
                                        <span>{stats?.finishedPackages ?? 0} finished</span>
                                      </div>
                                      {student.number_of_renewals != null && student.number_of_renewals > 0 && (
                                        <p className="text-sm text-muted-foreground">{student.number_of_renewals} renewal{student.number_of_renewals > 1 ? 's' : ''}</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Dates & Meta */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Info</p>
                                    <div className="space-y-1.5">
                                      {student.created_at && (
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <Calendar className="w-3 h-3 text-muted-foreground" />
                                          <span>Joined {format(new Date(student.created_at), 'dd MMM yyyy')}</span>
                                        </div>
                                      )}
                                      {student.age && (
                                        <p className="text-sm text-muted-foreground">Age: {student.age}</p>
                                      )}
                                      {student.gender && (
                                        <p className="text-sm text-muted-foreground">{student.gender}</p>
                                      )}
                                      {student.nationality && (
                                        <p className="text-sm text-muted-foreground">{student.nationality}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Action */}
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/students/${student.student_id}`);
                                    }}
                                  >
                                    View Full Profile →
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </td>
                        </tr>
                      )}
                    </>
                  </Collapsible>
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
