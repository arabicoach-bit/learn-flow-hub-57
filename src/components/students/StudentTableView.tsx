import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, MessageCircle } from 'lucide-react';
import { getWalletColor, getStatusBadgeClass, getStatusDisplayLabel, getPaymentStatus, getPaymentStatusBadgeClass } from '@/lib/wallet-utils';
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

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Teacher</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Lessons</th>
              <th>Next Lesson</th>
              <th>In-Progress</th>
              <th>Finished</th>
              <th>Payment</th>
              <th>Actions</th>
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
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/admin/students/${student.student_id}`)}
                  >
                    <td>
                      <div>
                        <span className="font-medium">{student.name}</span>
                        {student.created_at && (
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(student.created_at), 'MMM yyyy')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>{student.teachers?.name || '-'}</td>
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
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
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
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${getWalletColor(wallet)}`}
                        style={{
                          backgroundColor: wallet >= 5 ? 'rgb(16 185 129 / 0.15)' :
                            wallet >= 3 ? 'rgb(132 204 22 / 0.15)' :
                            wallet >= 1 ? 'rgb(245 158 11 / 0.15)' :
                            wallet === 0 ? 'rgb(249 115 22 / 0.15)' :
                            'rgb(239 68 68 / 0.15)'
                        }}
                      >
                        {wallet}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className="text-sm font-medium">
                        {stats ? `${stats.lessonsUsed}/${stats.lessonsTotal}` : '—'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className="text-sm">
                        {stats?.nextLessonDate
                          ? format(new Date(`${stats.nextLessonDate}T${stats.nextLessonTime || '00:00'}`), 'dd MMM yy HH:mm')
                          : '—'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className="text-sm font-medium">
                        {stats ? (stats.inProgressPackages > 0 ? stats.inProgressPackages : '0') : '—'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className="text-sm text-muted-foreground">
                        {stats ? (stats.finishedPackages > 0 ? stats.finishedPackages : '0') : '—'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {paymentStatus ? (
                        <Badge variant="outline" className={getPaymentStatusBadgeClass(paymentStatus)}>
                          {paymentStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const phone = student.phone?.replace(/[^0-9]/g, '');
                            if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(student)}
                        >
                          <Trash2 className="h-4 w-4" />
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
