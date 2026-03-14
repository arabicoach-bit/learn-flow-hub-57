import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Pencil, FileText, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/wallet-utils';
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

export function PackageTableView({
  packages, batchStats, isLoading, onMarkPaid, onEdit, onViewSummary,
}: PackageTableViewProps) {
  const navigate = useNavigate();

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
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Lessons</TableHead>
                  <TableHead className="text-center">Wallet</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Kind</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const stats = batchStats[pkg.package_id];
                  const used = stats?.used ?? 0;
                  const remaining = Math.max(0, pkg.lessons_purchased - used);
                  const description = (pkg as any).description;

                  return (
                    <TableRow key={pkg.package_id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/admin/students/${pkg.student_id}`)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{pkg.students?.name || 'Unknown'}</span>
                          {description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px]">
                                <p className="text-xs">{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{(pkg.students as any)?.teachers?.name || '-'}</TableCell>
                      <TableCell>
                        {pkg.start_date ? format(new Date(pkg.start_date), 'dd MMM yy') : '-'}
                      </TableCell>
                      <TableCell>{pkg.package_types?.name || 'Custom'}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={pkg.status === 'Active' ? 'default' : 'secondary'}
                          className={pkg.status === 'Active' ? 'bg-emerald-600' : ''}
                        >
                          {pkg.status === 'Active' ? 'In Progress' : 'Finished'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium text-sm">
                        {used}/{pkg.lessons_purchased}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={remaining <= 2 ? 'text-destructive font-bold' : 'text-emerald-600 font-medium'}>
                          {remaining}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {pkg.payment_status === 'Paid' ? (
                            <>
                              <Badge className="bg-emerald-600 hover:bg-emerald-700">Paid</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {(pkg as any).paid_date || pkg.payment_date
                                  ? format(new Date((pkg as any).paid_date || pkg.payment_date), 'dd MMM, yyyy')
                                  : '—'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                Due: {(pkg as any).due_date || pkg.start_date
                                  ? format(new Date((pkg as any).due_date || pkg.start_date), 'dd MMM, yyyy')
                                  : '—'}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(pkg.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={pkg.is_renewal ? 'border-blue-500 text-blue-600' : ''}>
                          {pkg.is_renewal ? 'Renewal' : 'New'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {pkg.payment_status !== 'Paid' && (
                            <Button
                              size="icon" variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); onMarkPaid(pkg); }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); onEdit(pkg); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); onViewSummary(pkg.package_id); }}>
                            <FileText className="w-4 h-4" />
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
  );
}
