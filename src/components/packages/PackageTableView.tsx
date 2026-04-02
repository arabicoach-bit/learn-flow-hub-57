import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Pencil, FileText, Info, MessageSquareText } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';
import { WalletBadge } from '@/components/shared/WalletBadge';
import { LessonsBadge } from '@/components/shared/LessonsBadge';
import { useStudentCommentsCounts } from '@/hooks/use-student-comments';
import { StudentCommentsDialog } from '@/components/students/StudentCommentsDialog';
import type { Package } from '@/hooks/use-packages';
import type { PackageBatchStats } from '@/hooks/use-packages-batch-stats';

interface PackageTableViewProps {
  packages: Package[];
  batchStats: Record<string, PackageBatchStats>;
  isLoading: boolean;
  onMarkPaid: (pkg: Package) => void;
  onEdit: (pkg: Package) => void;
  onViewSummary: (packageId: string) => void;
}

function getRowHighlight(pkg: Package) {
  if (pkg.status === 'Completed') return 'bg-muted/30 hover:bg-muted/50';
  if (pkg.payment_status === 'Paid') return 'bg-emerald-500/5 hover:bg-emerald-500/10';
  return 'bg-amber-500/5 hover:bg-amber-500/10';
}

export function PackageTableView({
  packages, batchStats, isLoading, onMarkPaid, onEdit, onViewSummary,
}: PackageTableViewProps) {
  const navigate = useNavigate();
  const studentIds = [...new Set(packages.map(p => p.student_id))];
  const { data: commentCounts } = useStudentCommentsCounts(studentIds);
  const [commentsStudent, setCommentsStudent] = useState<{ id: string; name: string } | null>(null);
  return (
    <>
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading packages...</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No packages found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center border-l border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Status</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Lessons</span>
                  </TableHead>
                  <TableHead className="text-center border-r border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Wallet</span>
                  </TableHead>
                  <TableHead className="text-center border-l border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Payment</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Amount</span>
                  </TableHead>
                  <TableHead className="text-center border-r border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Kind</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Notes</span>
                  </TableHead>
                  <TableHead className="w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const stats = batchStats[pkg.package_id];
                  const used = stats?.used ?? 0;
                  const remaining = stats?.scheduled ?? 0;
                  const description = (pkg as any).description;

                  return (
                    <TableRow
                      key={pkg.package_id}
                      className={`cursor-pointer transition-colors ${getRowHighlight(pkg)}`}
                      onClick={() => navigate(`/admin/students/${pkg.student_id}`)}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5 min-w-[100px]">
                          <span className="font-medium text-sm hover:text-primary">
                            {pkg.students?.name || 'Unknown'}
                          </span>
                          {description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px]">
                                <p className="text-xs">{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-2">{(pkg.students as any)?.teachers?.name || '—'}</TableCell>
                      <TableCell className="text-sm py-2">{pkg.package_types?.name || 'Custom'}</TableCell>

                      <TableCell className="text-center py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                        <Badge
                          variant={pkg.status === 'Active' ? 'default' : 'secondary'}
                          className={`text-[11px] px-1.5 py-0 ${pkg.status === 'Active' ? 'bg-emerald-600' : ''}`}
                        >
                          {pkg.status === 'Active' ? 'In Progress' : 'Finished'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-2" onClick={e => e.stopPropagation()}>
                        <LessonsBadge used={used} total={pkg.lessons_purchased} />
                      </TableCell>
                      <TableCell className="text-center py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                        <WalletBadge balance={remaining} />
                      </TableCell>

                      <TableCell className="text-center py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-0.5">
                          {pkg.payment_status === 'Paid' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[11px] px-1.5 py-0">Paid</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px] px-1.5 py-0">Pending</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground/70">
                            {pkg.payment_status === 'Paid' && pkg.paid_date
                              ? format(new Date(pkg.paid_date), 'dd MMM yyyy')
                              : pkg.created_at
                                ? format(new Date(pkg.created_at), 'dd MMM yyyy')
                                : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 font-medium text-sm" onClick={e => e.stopPropagation()}>
                        {formatCurrency(pkg.amount)}
                      </TableCell>
                      <TableCell className="text-center py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${pkg.is_renewal ? 'border-blue-500 text-blue-600' : ''}`}>
                          {pkg.is_renewal ? 'Renewal' : 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-2" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 relative"
                          onClick={() => setCommentsStudent({ id: pkg.student_id, name: pkg.students?.name || 'Unknown' })}
                        >
                          <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                          {(commentCounts?.[pkg.student_id] ?? 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                              {commentCounts![pkg.student_id]}
                            </span>
                          )}
                        </Button>
                      </TableCell>

                      <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          {pkg.payment_status !== 'Paid' && (
                            <Button size="icon" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 h-7 w-7" onClick={() => onMarkPaid(pkg)}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(pkg)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewSummary(pkg.package_id)}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    {commentsStudent && (
      <StudentCommentsDialog
        open={!!commentsStudent}
        onOpenChange={(open) => { if (!open) setCommentsStudent(null); }}
        studentId={commentsStudent.id}
        studentName={commentsStudent.name}
      />
    )}
    </>
