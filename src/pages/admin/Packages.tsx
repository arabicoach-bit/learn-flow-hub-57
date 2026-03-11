import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package as PackageIcon, FileSpreadsheet } from 'lucide-react';
import { usePackages, type Package } from '@/hooks/use-packages';
import { usePackageSummary } from '@/hooks/use-package-summary';
import { usePackagesBatchStats } from '@/hooks/use-packages-batch-stats';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';
import { PackageStatsCards } from '@/components/packages/PackageStatsCards';
import { PackageFiltersBar, type PackageSortOption } from '@/components/packages/PackageFiltersBar';
import { PackageTableView } from '@/components/packages/PackageTableView';
import { PackageSummaryDialog } from '@/components/packages/PackageSummaryDialog';
import { useTeachers } from '@/hooks/use-teachers';
import { formatCurrency } from '@/lib/wallet-utils';
import { exportPackages } from '@/lib/excel-export';
import { getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'Active' | 'Completed';

export default function Packages() {
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = usePackages();
  const { data: teachers } = useTeachers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<PackageSortOption>('newest');
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [summaryPkg, setSummaryPkg] = useState<string | null>(null);

  // Edit Payment Dialog
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { startDate, endDate } = getFilterDateRange(filter);
  const { data: summary, isLoading: summaryLoading } = usePackageSummary(summaryPkg);

  const filteredPackages = useMemo(() => {
    const filtered = (packages || []).filter(pkg => {
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
      const matchesTeacher = teacherFilter === 'all' || (pkg.students as any)?.teacher_id === teacherFilter;
      const matchesPayment = paymentFilter === 'all' || pkg.payment_status === paymentFilter;
      return matchesSearch && matchesPeriod && matchesStatus && matchesTeacher && matchesPayment;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.created_at || '').localeCompare(b.created_at || '');
        case 'alpha_asc':
          return (a.students?.name || '').localeCompare(b.students?.name || '');
        case 'alpha_desc':
          return (b.students?.name || '').localeCompare(a.students?.name || '');
        case 'due_date':
          return (a.due_date || '9999').localeCompare(b.due_date || '9999');
        case 'payment_date':
          return (b.payment_date || '').localeCompare(a.payment_date || '');
        case 'amount_high':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount_low':
          return (a.amount || 0) - (b.amount || 0);
        case 'newest':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
  }, [packages, searchQuery, startDate, endDate, statusFilter, teacherFilter, paymentFilter, sortBy]);

  // Batch stats for visible packages
  const visiblePackageIds = useMemo(() => filteredPackages.map(p => p.package_id), [filteredPackages]);
  const { data: batchStats } = usePackagesBatchStats(visiblePackageIds);

  // Aggregated stats
  const paidRev = filteredPackages.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingRev = filteredPackages.filter(p => p.payment_status !== 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const runningCount = filteredPackages.filter(p => p.status === 'Active').length;
  const completedCount = filteredPackages.filter(p => p.status === 'Completed').length;
  const renewalCount = filteredPackages.filter(p => p.is_renewal).length;
  const newCount = filteredPackages.filter(p => !p.is_renewal).length;

  const handleExport = () => {
    if (filteredPackages.length > 0) exportPackages(filteredPackages);
  };

  const handleMarkPaid = async (pkg: Package) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('packages')
        .update({ payment_status: 'Paid', payment_received: true, paid_date: now, payment_date: now })
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

  const summaryFallbackDesc = summaryPkg
    ? (filteredPackages.find(p => p.package_id === summaryPkg) as any)?.description
    : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
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

        <PackageStatsCards
          paidRevenue={paidRev} pendingRevenue={pendingRev}
          runningCount={runningCount} completedCount={completedCount}
          totalCount={filteredPackages.length} renewalCount={renewalCount} newCount={newCount}
        />

        <PackageFiltersBar
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          filter={filter} onFilterChange={setFilter}
          statusFilter={statusFilter} onStatusFilterChange={(v) => setStatusFilter(v as StatusFilter)}
          teacherFilter={teacherFilter} onTeacherFilterChange={setTeacherFilter}
          paymentFilter={paymentFilter} onPaymentFilterChange={setPaymentFilter}
          teachers={teachers}
          sortBy={sortBy} onSortChange={setSortBy}
        />

        <PackageTableView
          packages={filteredPackages}
          batchStats={batchStats || {}}
          isLoading={isLoading}
          onMarkPaid={handleMarkPaid}
          onEdit={setEditPackage}
          onViewSummary={setSummaryPkg}
        />
      </div>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Payment Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p><span className="text-muted-foreground">Student: </span>{editingPkg?.students?.name || 'Unknown'}</p>
              <p><span className="text-muted-foreground">Package: </span>{editingPkg?.lessons_purchased} lessons</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="number" className="pl-12" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            {editPaymentStatus === 'Paid' && (
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditPackageDialog
        package_={editPackage}
        open={!!editPackage}
        onOpenChange={(open) => !open && setEditPackage(null)}
        onSuccess={() => { setEditPackage(null); queryClient.invalidateQueries({ queryKey: ['packages'] }); }}
      />

      <PackageSummaryDialog
        open={!!summaryPkg}
        onOpenChange={(o) => !o && setSummaryPkg(null)}
        summary={summary}
        isLoading={summaryLoading}
        fallbackDescription={summaryFallbackDesc}
      />
    </AdminLayout>
  );
}
