import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package as PackageIcon, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { usePackages, type Package } from '@/hooks/use-packages';
import { usePackageSummary } from '@/hooks/use-package-summary';
import { usePackagesBatchStats } from '@/hooks/use-packages-batch-stats';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';
import { PackageStatsBar } from '@/components/packages/PackageStatsBar';
import { PackageFiltersBar, type PackageSortOption } from '@/components/packages/PackageFiltersBar';
import { PackageTableView } from '@/components/packages/PackageTableView';
import { PackageSummaryDialog } from '@/components/packages/PackageSummaryDialog';
import { useTeachers } from '@/hooks/use-teachers';
import { formatCurrency } from '@/lib/wallet-utils';
import { exportPackages } from '@/lib/excel-export';
import { getCurrentQuarter, getQuarterDateRange, type QuarterFilterValue } from '@/components/shared/QuarterFilter';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParamState } from '@/hooks/use-search-param-state';

type StatusFilter = 'all' | 'Active' | 'Completed';
type TabValue = 'all' | 'in_progress' | 'finished' | 'paid' | 'pending' | 'new';

export default function Packages() {
  const queryClient = useQueryClient();
  const { data: packages, isLoading } = usePackages();
  const { data: teachers } = useTeachers();
  const [searchQuery, setSearchQuery] = useSearchParamState('q', '');
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilterValue>(getCurrentQuarter);
  const [statusFilter, setStatusFilter] = useSearchParamState('status', 'all') as [string, (v: string) => void];
  const [teacherFilter, setTeacherFilter] = useSearchParamState('teacher', 'all');
  const [paymentFilter, setPaymentFilter] = useSearchParamState('payment', 'all');
  const [sortBy, setSortBy] = useSearchParamState('sort', 'newest') as [string, (v: string) => void];
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [summaryPkg, setSummaryPkg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  // Edit Payment Dialog
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { startDate, endDate } = getQuarterDateRange(quarterFilter);
  const { data: summary, isLoading: summaryLoading } = usePackageSummary(summaryPkg);

  const baseFiltered = useMemo(() => {
    const filtered = (packages || []).filter(pkg => {
      const studentName = pkg.students?.name?.toLowerCase() || '';
      const packageType = pkg.package_types?.name?.toLowerCase() || '';
      const matchesSearch = searchQuery === '' ||
        studentName.includes(searchQuery.toLowerCase()) ||
        packageType.includes(searchQuery.toLowerCase());

      // Rollover logic: In-Progress (Active) packages roll over across quarters,
      // Finished (Completed) packages only show in the quarter they were created
      let matchesPeriod = true;
      if (startDate && endDate && pkg.created_at) {
        const createdDate = pkg.created_at.slice(0, 10);
        if (pkg.status === 'Completed') {
          // Finished packages: must have been created within or before the quarter,
          // and completed within the quarter
          const completedDate = pkg.completed_date?.slice(0, 10);
          matchesPeriod = completedDate
            ? completedDate >= startDate && completedDate <= endDate
            : createdDate >= startDate && createdDate <= endDate;
        } else {
          // In-Progress (Active) packages: include if created before or during the quarter end
          matchesPeriod = createdDate <= endDate;
        }
      }

      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
      const matchesTeacher = teacherFilter === 'all' || (pkg.students as any)?.teacher_id === teacherFilter;
      const matchesPayment = paymentFilter === 'all' || pkg.payment_status === paymentFilter;
      return matchesSearch && matchesPeriod && matchesStatus && matchesTeacher && matchesPayment;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return (a.created_at || '').localeCompare(b.created_at || '');
        case 'alpha_asc': return (a.students?.name || '').localeCompare(b.students?.name || '');
        case 'alpha_desc': return (b.students?.name || '').localeCompare(a.students?.name || '');
        case 'due_date': return ((a as any).due_date || '9999').localeCompare((b as any).due_date || '9999');
        case 'payment_date': return (b.payment_date || '').localeCompare(a.payment_date || '');
        case 'amount_high': return (b.amount || 0) - (a.amount || 0);
        case 'amount_low': return (a.amount || 0) - (b.amount || 0);
        case 'newest': default: return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
  }, [packages, searchQuery, startDate, endDate, statusFilter, teacherFilter, paymentFilter, sortBy]);

  // Tab-filtered list
  const filteredPackages = useMemo(() => {
    if (activeTab === 'all') return baseFiltered;
    if (activeTab === 'in_progress') return baseFiltered.filter(p => p.status === 'Active');
    if (activeTab === 'finished') return baseFiltered.filter(p => p.status === 'Completed');
    if (activeTab === 'paid') return baseFiltered.filter(p => p.payment_status === 'Paid');
    if (activeTab === 'pending') return baseFiltered.filter(p => p.payment_status !== 'Paid');
    if (activeTab === 'new') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      return baseFiltered.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    return baseFiltered;
  }, [baseFiltered, activeTab]);

  // Batch stats for visible packages
  const visiblePackageIds = useMemo(() => filteredPackages.map(p => p.package_id), [filteredPackages]);
  const { data: batchStats } = usePackagesBatchStats(visiblePackageIds);

  // Stats from baseFiltered (not tab-filtered)
  const paidRev = baseFiltered.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingRev = baseFiltered.filter(p => p.payment_status !== 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const runningCount = baseFiltered.filter(p => p.status === 'Active').length;
  const completedCount = baseFiltered.filter(p => p.status === 'Completed').length;
  const renewalCount = baseFiltered.filter(p => p.is_renewal).length;
  const newCount = baseFiltered.filter(p => !p.is_renewal).length;

  const newThisMonthCount = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return baseFiltered.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [baseFiltered]);

  const tabCounts = {
    all: baseFiltered.length,
    in_progress: runningCount,
    finished: completedCount,
    paid: baseFiltered.filter(p => p.payment_status === 'Paid').length,
    pending: baseFiltered.filter(p => p.payment_status !== 'Paid').length,
    new: newThisMonthCount,
  };

  const handleExport = () => {
    if (filteredPackages.length > 0) exportPackages(filteredPackages);
  };

  const [markPaidPkg, setMarkPaidPkg] = useState<Package | null>(null);

  const handleMarkPaid = async () => {
    if (!markPaidPkg) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('packages')
        .update({ payment_status: 'Paid', payment_received: true, paid_date: now, payment_date: now })
        .eq('package_id', markPaidPkg.package_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Marked as Paid for ${markPaidPkg.students?.name}`);
      setMarkPaidPkg(null);
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
    ? (baseFiltered.find(p => p.package_id === summaryPkg) as any)?.description
    : null;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <PackageIcon className="h-6 w-6 text-primary" />
            Packages
          </h1>
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Compact Stats */}
        <PackageStatsBar
          paidRevenue={paidRev} pendingRevenue={pendingRev}
          runningCount={runningCount} completedCount={completedCount}
          totalCount={baseFiltered.length} renewalCount={renewalCount} newCount={newCount}
        />

        {/* Filters */}
        <PackageFiltersBar
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          quarterFilter={quarterFilter} onQuarterChange={setQuarterFilter}
          statusFilter={statusFilter} onStatusFilterChange={(v) => setStatusFilter(v as StatusFilter)}
          teacherFilter={teacherFilter} onTeacherFilterChange={setTeacherFilter}
          paymentFilter={paymentFilter} onPaymentFilterChange={setPaymentFilter}
          teachers={teachers}
          sortBy={sortBy as PackageSortOption} onSortChange={setSortBy}
        />

        {/* Tabs + Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-muted/50 h-9">
            <TabsTrigger value="all" className="text-xs h-7 px-3">
              All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="new" className="text-xs h-7 px-3">
              New <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-500">{tabCounts.new}</Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs h-7 px-3">
              In Progress <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-500">{tabCounts.in_progress}</Badge>
            </TabsTrigger>
            <TabsTrigger value="finished" className="text-xs h-7 px-3">
              Finished <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{tabCounts.finished}</Badge>
            </TabsTrigger>
            <TabsTrigger value="paid" className="text-xs h-7 px-3">
              Paid <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-500">{tabCounts.paid}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs h-7 px-3">
              Pending <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-500">{tabCounts.pending}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            <PackageTableView
              packages={filteredPackages}
              batchStats={batchStats || {}}
              isLoading={isLoading}
              onMarkPaid={(pkg) => setMarkPaidPkg(pkg)}
              onEdit={setEditPackage}
              onViewSummary={setSummaryPkg}
            />
          </TabsContent>
        </Tabs>
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

      {/* Mark Paid Confirmation */}
      <AlertDialog open={!!markPaidPkg} onOpenChange={(open) => !open && setMarkPaidPkg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">This will update the payment status</p>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <AlertDialogDescription>
              Mark package for <strong>{markPaidPkg?.students?.name}</strong> ({markPaidPkg?.lessons_purchased} lessons – AED {markPaidPkg?.amount}) as <strong>Paid</strong>? The paid date will be set to today.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkPaid}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
