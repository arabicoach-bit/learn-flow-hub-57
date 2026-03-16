import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Pencil, FileText, Info, ChevronRight, Calendar, Clock, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';
import { WalletBadge } from '@/components/shared/WalletBadge';
import { LessonsBadge } from '@/components/shared/LessonsBadge';
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
  return 'bg-amber-500/5 hover:bg-amber-500/10'; // Pending payment
}

export function PackageTableView({
  packages, batchStats, isLoading, onMarkPaid, onEdit, onViewSummary,
}: PackageTableViewProps) {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
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
                  <TableHead className="w-[28px] px-2"></TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Plan</TableHead>
                  {/* Status group */}
                  <TableHead className="text-center border-l border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Status</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Lessons</span>
                  </TableHead>
                  <TableHead className="text-center border-r border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Wallet</span>
                  </TableHead>
                  {/* Payment group */}
                  <TableHead className="text-center border-l border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Payment</span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Amount</span>
                  </TableHead>
                  <TableHead className="text-center border-r border-border/50">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Kind</span>
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
                  const isExpanded = expandedIds.has(pkg.package_id);

                  return (
                    <Collapsible key={pkg.package_id} open={isExpanded} onOpenChange={() => toggleExpand(pkg.package_id)} asChild>
                      <>
                        <TableRow
                          className={`cursor-pointer transition-colors ${getRowHighlight(pkg)} ${isExpanded ? 'border-b-0' : ''}`}
                          onClick={() => toggleExpand(pkg.package_id)}
                        >
                          <TableCell className="px-2 py-2">
                            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5 min-w-[100px]">
                              <span
                                className="font-medium text-sm hover:text-primary cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/students/${pkg.student_id}`); }}
                              >
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

                          {/* Status group */}
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

                          {/* Payment group */}
                          <TableCell className="text-center py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                            {pkg.payment_status === 'Paid' ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[11px] px-1.5 py-0">Paid</Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px] px-1.5 py-0">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2 font-medium text-sm" onClick={e => e.stopPropagation()}>
                            {formatCurrency(pkg.amount)}
                          </TableCell>
                          <TableCell className="text-center py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                            <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${pkg.is_renewal ? 'border-blue-500 text-blue-600' : ''}`}>
                              {pkg.is_renewal ? 'Renewal' : 'New'}
                            </Badge>
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

                        {isExpanded && (
                          <tr className="bg-muted/20 border-b">
                            <td colSpan={11} className="p-0">
                              <CollapsibleContent forceMount className="px-6 py-4">
                                <div className="grid grid-cols-3 gap-6 text-sm">
                                  {/* Package Details */}
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Package Details</h4>
                                    <div className="space-y-1.5">
                                      {pkg.start_date && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <Calendar className="w-3.5 h-3.5" />
                                          <span>Start: {format(new Date(pkg.start_date), 'dd MMM yyyy')}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{pkg.lesson_duration || 60} min lessons</span>
                                      </div>
                                      {pkg.created_at && (
                                        <div className="text-xs text-muted-foreground">
                                          Created: {format(new Date(pkg.created_at), 'dd MMM yyyy')}
                                        </div>
                                      )}
                                      {description && (
                                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lesson Breakdown */}
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lesson Breakdown</h4>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Used (Completed + Absent)</span>
                                        <span className="font-medium">{used}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Scheduled</span>
                                        <span className="font-medium text-blue-500">{remaining}</span>
                                      </div>
                                      <div className="flex justify-between text-sm border-t border-border/30 pt-1">
                                        <span className="text-muted-foreground">Total</span>
                                        <span className="font-medium">{pkg.lessons_purchased}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment Info */}
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</h4>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Amount</span>
                                        <span className="font-medium">{formatCurrency(pkg.amount)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className={pkg.payment_status === 'Paid' ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                                          {pkg.payment_status}
                                        </span>
                                      </div>
                                      {pkg.payment_status === 'Paid' && ((pkg as any).paid_date || pkg.payment_date) && (
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                          <CreditCard className="w-3.5 h-3.5" />
                                          <span>Paid: {format(new Date((pkg as any).paid_date || pkg.payment_date), 'dd MMM yyyy')}</span>
                                        </div>
                                      )}
                                      {pkg.payment_status !== 'Paid' && ((pkg as any).due_date || pkg.start_date) && (
                                        <div className="flex items-center gap-2 text-amber-500 text-xs">
                                          <Calendar className="w-3.5 h-3.5" />
                                          <span>Due: {format(new Date((pkg as any).due_date || pkg.start_date), 'dd MMM yyyy')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
                                  <Button
                                    size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={(e) => { e.stopPropagation(); onViewSummary(pkg.package_id); }}
                                  >
                                    View Summary Report →
                                  </Button>
                                  <Button
                                    size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/students/${pkg.student_id}`); }}
                                  >
                                    View Student Profile →
                                  </Button>
                                </div>
                              </CollapsibleContent>
                            </td>
                          </tr>
                        )}
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
