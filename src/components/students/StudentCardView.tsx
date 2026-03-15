import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MessageCircle, Calendar, BookOpen, Wallet, Package } from 'lucide-react';
import { getWalletColor, getStatusBadgeClass, getStatusDisplayLabel, getPaymentStatus, getPaymentStatusBadgeClass } from '@/lib/wallet-utils';
import type { Student } from '@/hooks/use-students';
import type { StudentBatchStats } from '@/hooks/use-students-batch-stats';

interface StudentCardViewProps {
  students: Student[];
  batchStats: Record<string, StudentBatchStats>;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function StudentCardView({ students, batchStats, onEdit, onDelete }: StudentCardViewProps) {
  const navigate = useNavigate();

  if (students.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No students found</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => {
        const wallet = student.wallet_balance || 0;
        const stats = batchStats[student.student_id];
        const paymentStatus = getPaymentStatus(student.status, wallet, stats?.hasAnyPendingPackage ?? false);

        return (
          <Card
            key={student.student_id}
            className="cursor-pointer group relative"
            onClick={() => navigate(`/admin/students/${student.student_id}`)}
          >
            <CardContent className="pt-5 pb-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate">{student.name}</h3>
                  <p className="text-xs text-muted-foreground">{student.teachers?.name || 'No teacher'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={getStatusBadgeClass(student.status)}>
                    {getStatusDisplayLabel(student.status)}
                  </Badge>
                  {paymentStatus && (
                    <Badge variant="outline" className={`${getPaymentStatusBadgeClass(paymentStatus)} text-[10px]`}>
                      {paymentStatus}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <Wallet className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                  <span className={`text-sm font-bold ${getWalletColor(wallet)}`}>{wallet}</span>
                  <p className="text-[10px] text-muted-foreground">Wallet</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <BookOpen className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-sm font-bold">
                    {stats ? `${stats.lessonsUsed}/${stats.lessonsTotal}` : '—'}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Lessons</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <Calendar className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-sm font-bold">
                    {stats?.nextLessonDate ? format(new Date(stats.nextLessonDate), 'dd MMM') : '—'}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Next</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <Package className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-sm font-bold">
                    {stats ? `${stats.inProgressPackages}/${stats.finishedPackages}` : '—'}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Pkg</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-[10px] text-muted-foreground">
                  {student.created_at ? `Joined ${format(new Date(student.created_at), 'MMM yyyy')}` : ''}
                </span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      const phone = student.phone?.replace(/[^0-9]/g, '');
                      if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(student)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(student)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
