import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package as PackageIcon, FileSpreadsheet, Search, Filter, CheckCircle, Pencil, FileText } from 'lucide-react';
import { usePackages, type Package } from '@/hooks/use-packages';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';
import { useTeachers } from '@/hooks/use-teachers';
import { formatCurrency } from '@/lib/wallet-utils';
import { format } from 'date-fns';
import { exportPackages } from '@/lib/excel-export';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'Active' | 'Completed';

function LessonsCell({ packageId, total }: { 
  packageId: string;
  total: number;
}) {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .in('status', ['completed', 'absent'])
      .then(({ count: c }) => setUsed(c ?? 0));
  }, [packageId]);
  if (used === null) return (
    <TableCell className="text-center text-muted-foreground">...</TableCell>
  );
  return (
    <TableCell className="text-center font-medium text-sm">
      {used}/{total}
    </TableCell>
  );
}

function WalletCell({ packageId, total }: { 
  packageId: string;
  total: number;
}) {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .in('status', ['completed', 'absent'])
      .then(({ count: c }) => setUsed(c ?? 0));
  }, [packageId]);
  if (used === null) return (
    <TableCell className="text-center text-muted-foreground">...</TableCell>
  );
  const remaining = Math.max(0, total - (used ?? 0));
  return (
    <TableCell className="text-center">
      <span className={
        remaining <= 2
          ? 'text-red-500 font-bold'
          : 'text-emerald-500 font-medium'
      }>
        {remaining}
      </span>
    </TableCell>
  );
}

export default function Packages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = usePackages();
  const { data: teachers } = useTeachers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<YearMonthFilterValue>(getDefaultFilter());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [editPackage, setEditPackage] = useState<Package | null>(null);

  // Edit Payment Dialog state
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { startDate, endDate } = getFilterDateRange(filter);

  const filteredPackages = packages?.filter(pkg => {
    const studentName = pkg.students?.name?.toLowerCase() || '';
    const packageType = pkg.package_types?.name?.toLowerCase() || '';
    const matchesSearch = searchQuery === '' || 
      studentName.includes(searchQuery.toLowerCase()) ||
      packageType.includes(searchQuery.toLowerCase());

    let matchesPeriod = true;
    if (startDate && endDate && pkg.created_at) {
      const createdDate = pkg.created_at.slice(0, 10);
      matchesPeriod = createdDate >= startDate && createdDate <= endDate;
    }

    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    const matchesTeacher = teacherFilter === 'all'
      || (pkg.students as any)?.teacher_id === teacherFilter;
    const matchesPayment = paymentFilter === 'all'
      || pkg.payment_status === paymentFilter;
    return matchesSearch && matchesPeriod && matchesStatus && matchesTeacher && matchesPayment;
  }) || [];

  const paidRev = filteredPackages
    .filter(p => p.payment_status === 'Paid')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pendingRev = filteredPackages
    .filter(p => p.payment_status !== 'Paid')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const runningCount = filteredPackages
    .filter(p => p.status === 'Active' || (p.status as string) === 'Running').length;
  const renewalCount = filteredPackages
    .filter(p => p.is_renewal).length;
  const newCount = filteredPackages
    .filter(p => !p.is_renewal).length;

  const handleExport = () => {
    if (filteredPackages.length > 0) exportPackages(filteredPackages);
  };

  const handleOpenEditPayment = (pkg: Package) => {
    setEditingPkg(pkg);
    setEditPaymentStatus(pkg.payment_status || 'Pending');
    setEditAmount(pkg.amount?.toString() || '');
    setEditPaymentDate(
      pkg.payment_date
        ? new Date(pkg.payment_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setIsEditPaymentOpen(true);
  };

  const handleMarkPaid = async (pkg: Package) => {
    try {
      const { error } = await supabase
        .from('packages')
        .update({
          payment_status: 'Paid',
          payment_received: true,
          paid_date: new Date().toISOString(),
          payment_date: new Date().toISOString(),
        })
        .eq('package_id', pkg.package_id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Marked as Paid for ${pkg.students?.name}`);
    } catch (error: any) {
      toast.error('Failed to update payment', { description: error.message });
    }
  };

  const handleSavePayment = async () => {
    if (!editingPkg) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('packages')
        .update({
          payment_status: editPaymentStatus,
          amount: parseFloat(editAmount) || 0,
          payment_received: editPaymentStatus === 'Paid',
          payment_date: editPaymentStatus === 'Paid' ? editPaymentDate : editingPkg.payment_date,
        })
        .eq('package_id', editingPkg.package_id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Payment updated!');
      setIsEditPaymentOpen(false);
    } catch (error: any) {
      toast.error('Failed to update payment', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <PackageIcon className="h-6 w-6 text-primary" />
              Packages
            </h1>
            <p className="text-muted-foreground">Track all student packages and renewals</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(paidRev)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingRev)}</div>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{runningCount}</div>
              <p className="text-sm text-muted-foreground">Running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{filteredPackages.length}</div>
              <p className="text-sm text-muted-foreground">Total Packages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{renewalCount}</div>
              <p className="text-sm text-muted-foreground">Renewals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{newCount}</div>
              <p className="text-sm text-muted-foreground">New</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student or package type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <YearMonthFilter value={filter} onChange={setFilter} />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers?.map(t => (
                    <SelectItem key={t.teacher_id} value={t.teacher_id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Packages Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading packages...</div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No packages found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
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
                    {filteredPackages.map((pkg) => (
                      <TableRow key={pkg.package_id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {(pkg as any).human_id || pkg.package_id.slice(0, 8)}
                        </TableCell>
                        <TableCell
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/admin/students/${pkg.student_id}`)}
                        >
                          {pkg.students?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {(pkg.students as any)?.teachers?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {pkg.start_date
                            ? format(new Date(pkg.start_date), 'dd MMM yy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {pkg.package_types?.name || 'Custom'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={pkg.status === 'Active' ? 'default' : 'secondary'} className={pkg.status === 'Active' ? 'bg-green-600' : ''}>
                            {pkg.status === 'Active' ? 'Running' : pkg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {pkg.lessons_used || 0}/{pkg.lessons_purchased}
                        </TableCell>
                        <WalletCell packageId={pkg.package_id} />
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
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleMarkPaid(pkg); }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); handleOpenEditPayment(pkg); }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/package-summaries?package=${pkg.package_id}`);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Payment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Student: </span>
                {editingPkg?.students?.name || 'Unknown'}
              </p>
              <p>
                <span className="text-muted-foreground">Package: </span>
                {editingPkg?.lessons_purchased} lessons
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">⏳ Pending</SelectItem>
                  <SelectItem value="Paid">✅ Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (AED)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">AED</span>
                <Input
                  type="number"
                  className="pl-12"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>

            {editPaymentStatus === 'Paid' && (
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
