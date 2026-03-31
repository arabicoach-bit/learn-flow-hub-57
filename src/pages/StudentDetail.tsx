import React, { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { YearMonthFilter, getDefaultFilter, getFilterDateRange, type YearMonthFilterValue } from '@/components/shared/YearMonthFilter';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useStudent } from '@/hooks/use-students';
import { usePackages, Package, useDeletePackage } from '@/hooks/use-packages';

import { useTeachers } from '@/hooks/use-teachers';
import { usePrograms } from '@/hooks/use-programs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, User, Wallet, CreditCard, BookOpen, Loader2, Plus, RefreshCw, Pencil, ChevronDown, ChevronRight, Trash2, ArrowRightLeft } from 'lucide-react';
import { getWalletColor, getStatusBadgeClass, formatCurrency, formatDate, formatDateTime, getStatusDisplayLabel } from '@/lib/wallet-utils';
import { StudentLessonsView } from '@/components/student/StudentLessonsView';
import { StudentInfoView } from '@/components/student/StudentInfoView';
import { AddPackageForm } from '@/components/packages/AddPackageForm';
import { RenewPackageForm } from '@/components/packages/RenewPackageForm';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';

import { PackageHistoryTimeline } from '@/components/packages/PackageHistoryTimeline';
import { PackageLessonsTable } from '@/components/packages/PackageLessonsTable';
import { TransferStudentDialog } from '@/components/student/TransferStudentDialog';

interface StudentPackagesTabProps {
  packages: Package[];
  packagesLoading: boolean;
  packagesError: any;
  packagesFetching: boolean;
  refetchPackages: () => void;
  expandedPackageId: string | null;
  setExpandedPackageId: (id: string | null) => void;
  setIsAddPackageOpen: (v: boolean) => void;
  setIsRenewPackageOpen: (v: boolean) => void;
  setEditPackage: (pkg: Package | null) => void;
  setRenewPackageId: (id: string | undefined) => void;
  setDeletePackageId: (id: string | null) => void;
  studentId: string;
  teacherId: string;
}

function StudentPackagesTab({
  packages, packagesLoading, packagesError, packagesFetching, refetchPackages,
  expandedPackageId, setExpandedPackageId,
  setIsAddPackageOpen, setIsRenewPackageOpen, setEditPackage, setRenewPackageId, setDeletePackageId,
  studentId, teacherId,
}: StudentPackagesTabProps) {
  const [pkgSearch, setPkgSearch] = React.useState('');
  const [pkgStatusFilter, setPkgStatusFilter] = React.useState('all');
  const [pkgPaymentFilter, setPkgPaymentFilter] = React.useState('all');
  const [pkgFilter, setPkgFilter] = React.useState<YearMonthFilterValue>({ year: null, month: null });
  const [nextLessons, setNextLessons] = React.useState<Record<string, string | null>>({});
  const [lessonCounts, setLessonCounts] = React.useState<Record<string, number>>({});
  const [endDates, setEndDates] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    if (!packages?.length) return;
    packages.forEach(async (pkg) => {
      const { data: next } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_date, scheduled_time')
        .eq('package_id', pkg.package_id)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .single();
      setNextLessons(prev => ({
        ...prev,
        [pkg.package_id]: next
          ? `${format(new Date(next.scheduled_date), 'dd MMM yy')} ${next.scheduled_time?.slice(0,5) || ''}`
          : null
      }));
      const { count } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id', { count: 'exact', head: true })
        .eq('package_id', pkg.package_id)
        .in('status', ['completed', 'absent']);
      setLessonCounts(prev => ({
          ...prev,
          [pkg.package_id]: count ?? 0
        }));
        // Fetch last lesson date (end date)
        const { data: last } = await supabase
          .from('scheduled_lessons')
          .select('scheduled_date')
          .eq('package_id', pkg.package_id)
          .order('scheduled_date', { ascending: false })
          .limit(1)
          .single();
        setEndDates(prev => ({
          ...prev,
          [pkg.package_id]: last?.scheduled_date
            ? format(new Date(last.scheduled_date), 'dd MMM yy')
            : null
        }));
      });
  }, [packages]);

  const { startDate: sd, endDate: ed } = getFilterDateRange(pkgFilter);

  const fp = (packages || []).filter(pkg => {
    const matchSearch = pkgSearch === ''
      || pkg.package_types?.name?.toLowerCase().includes(pkgSearch.toLowerCase())
      || (pkg as any).description?.toLowerCase().includes(pkgSearch.toLowerCase());
    let matchPeriod = true;
    if (sd && ed && pkg.created_at) {
      const d = pkg.created_at.slice(0,10);
      matchPeriod = d >= sd && d <= ed;
    }
    const matchStatus =
      pkgStatusFilter === 'all'
      || (pkgStatusFilter === 'Active' && pkg.status === 'Active')
      || (pkgStatusFilter === 'Completed' && pkg.status === 'Completed');
    const matchPayment =
      pkgPaymentFilter === 'all'
      || pkg.payment_status === pkgPaymentFilter;
    return matchSearch && matchPeriod && matchStatus && matchPayment;
  });

  const paidRev = fp.filter(p => p.payment_status === 'Paid').reduce((s,p) => s + (p.amount||0), 0);
  const pendingRev = fp.filter(p => p.payment_status !== 'Paid').reduce((s,p) => s + (p.amount||0), 0);
  const runningCnt = fp.filter(p => p.status === 'Active').length;
  const completedCnt = fp.filter(p => p.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xl font-bold text-primary">AED {paidRev.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Revenue</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xl font-bold text-amber-500">AED {pendingRev.toLocaleString()}</div><div className="text-xs text-muted-foreground">Pending Payments</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xl font-bold text-emerald-500">{runningCnt}</div><div className="text-xs text-muted-foreground">In Progress</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xl font-bold text-muted-foreground">{completedCnt}</div><div className="text-xs text-muted-foreground">Finished</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search packages..." value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} className="w-48" />
        <YearMonthFilter value={pkgFilter} onChange={setPkgFilter} />
        <Select value={pkgStatusFilter} onValueChange={setPkgStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">In Progress</SelectItem>
            <SelectItem value="Completed">Finished</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pkgPaymentFilter} onValueChange={setPkgPaymentFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Packages</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {packages && packages.length > 0 && (
              <Button variant="outline" onClick={() => setIsRenewPackageOpen(true)} className="gap-2">
                <RefreshCw className="w-4 h-4" />Renew
              </Button>
            )}
            <Button onClick={() => setIsAddPackageOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />Add Package
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {packagesLoading ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : packagesError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">Couldn't load packages</p>
              <Button variant="outline" onClick={() => refetchPackages()} className="gap-2" disabled={packagesFetching}>
                {packagesFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Retry
              </Button>
            </div>
          ) : !fp.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No packages found</p>
              <Button onClick={() => setIsAddPackageOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add First Package</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lessons</TableHead>
                    <TableHead>Next Lesson</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fp.map((pkg) => {
                    const isExpanded = expandedPackageId === pkg.package_id;
                    const used = lessonCounts[pkg.package_id] ?? 0;
                    const nextLesson = nextLessons[pkg.package_id];
                    return (
                      <React.Fragment key={pkg.package_id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedPackageId(isExpanded ? null : pkg.package_id)}>
                          <TableCell>{isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}</TableCell>
                          <TableCell>{pkg.start_date ? format(new Date(pkg.start_date), 'dd MMM yy') : '-'}</TableCell>
                          <TableCell>{endDates[pkg.package_id] || '—'}</TableCell>
                          <TableCell className="font-medium">{pkg.package_types?.name || 'Custom'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{(pkg as any).description || '—'}</TableCell>
                          <TableCell><Badge variant="outline" className={pkg.status === 'Active' ? 'status-active' : 'status-grace'}>{pkg.status === 'Active' ? 'In Progress' : 'Finished'}</Badge></TableCell>
                          <TableCell>{used}/{pkg.lessons_purchased}</TableCell>
                          <TableCell>{nextLesson ? <span className="text-xs text-muted-foreground">{nextLesson}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {pkg.payment_status === 'Paid' ? (
                                <>
                                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">Paid</Badge>
                                  <div className="text-[10px] text-muted-foreground">{(pkg as any).paid_date || pkg.payment_date ? format(new Date((pkg as any).paid_date || pkg.payment_date), 'dd MMM, yyyy') : '—'}</div>
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">Pending</Badge>
                                  <div className="text-[10px] text-muted-foreground">Due: {(pkg as any).due_date || pkg.start_date ? format(new Date((pkg as any).due_date || pkg.start_date), 'dd MMM, yyyy') : '—'}</div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(pkg.amount)}</TableCell>
                          
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditPackage(pkg)} className="gap-1 text-xs"><Pencil className="w-3 h-3" />Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setRenewPackageId(pkg.package_id); setIsRenewPackageOpen(true); }} className="gap-1 text-xs"><RefreshCw className="w-3 h-3" />Renew</Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeletePackageId(pkg.package_id)} className="gap-1 text-xs text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" />Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={11} className="bg-muted/30 p-4">
                              <div className="text-sm font-medium mb-2 text-muted-foreground">Scheduled Lessons</div>
                              <PackageLessonsTable packageId={pkg.package_id} studentId={studentId} teacherId={teacherId} lessonDuration={pkg.lesson_duration || 45} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'payments';
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [isRenewPackageOpen, setIsRenewPackageOpen] = useState(false);
  
  const [renewPackageId, setRenewPackageId] = useState<string | undefined>();
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const { data: student, isLoading: studentLoading } = useStudent(id || '');
  const packagesQuery = usePackages(id);
  const {
    data: packages,
    isLoading: packagesLoading,
    isFetching: packagesFetching,
    error: packagesError,
    refetch: refetchPackages,
  } = packagesQuery;
  
  const deletePackage = useDeletePackage();

  if (studentLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!student) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Student not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold">{student.name}</h1>
              <p className="text-muted-foreground">{student.phone}</p>
            </div>
          </div>
          {student.teacher_id && (
            <Button variant="outline" onClick={() => setIsTransferOpen(true)} className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Transfer
            </Button>
          )}
        </div>

        {/* Student Info Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <Badge className={getStatusBadgeClass(student.status)}>
                    {getStatusDisplayLabel(student.status)}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.teachers?.name || 'No teacher assigned'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6" style={{ color: `hsl(${getWalletColor(student.wallet_balance)})` }} />
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p 
                    className="text-3xl font-bold"
                    style={{ color: `hsl(${getWalletColor(student.wallet_balance)})` }}
                  >
                    {student.wallet_balance}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Package Dialog */}
        <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Package for {student.name}</DialogTitle>
            </DialogHeader>
            <AddPackageForm
              studentId={id!}
              studentName={student.name}
              currentWallet={student.wallet_balance || 0}
              onSuccess={() => setIsAddPackageOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Renew Package Dialog */}
        <Dialog open={isRenewPackageOpen} onOpenChange={setIsRenewPackageOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Renew Package for {student.name}</DialogTitle>
            </DialogHeader>
            <RenewPackageForm
              studentId={id!}
              studentName={student.name}
              currentWallet={student.wallet_balance || 0}
              previousPackageId={renewPackageId || student.current_package_id || undefined}
              teacherId={student.teacher_id || undefined}
              onSuccess={() => {
                setIsRenewPackageOpen(false);
                setRenewPackageId(undefined);
              }}
              onCancel={() => {
                setIsRenewPackageOpen(false);
                setRenewPackageId(undefined);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Package Dialog */}
        <EditPackageDialog
          package_={editPackage}
          open={!!editPackage}
          onOpenChange={(open) => !open && setEditPackage(null)}
          onSuccess={() => setEditPackage(null)}
        />


        {/* Delete Package Confirmation */}
        <AlertDialog open={!!deletePackageId} onOpenChange={(open) => { if (!open) setDeletePackageId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this package? This will permanently remove:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>The package record</li>
                  <li>All scheduled lessons linked to it</li>
                  <li>The student's wallet balance will be adjusted accordingly</li>
                </ul>
                <span className="block mt-2 font-medium text-destructive">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deletePackageId || !id) return;
                  try {
                    const result = await deletePackage.mutateAsync({ packageId: deletePackageId, studentId: id });
                    toast.success(`Package deleted. Wallet adjusted by -${result.lessonsRemaining} lessons.`);
                    setDeletePackageId(null);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to delete package');
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePackage.isPending ? 'Deleting...' : 'Delete Package'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Transfer Student Dialog */}
        <TransferStudentDialog
          studentId={id!}
          studentName={student.name}
          currentTeacherId={student.teacher_id}
          currentTeacherName={student.teachers?.name || 'No teacher'}
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
        />

        {/* Tabs - 3 tabs only: Packages (admin), Lessons, Student Info */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Student Information
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <StudentPackagesTab
              packages={packages || []}
              packagesLoading={packagesLoading}
              packagesError={packagesError}
              packagesFetching={packagesFetching}
              refetchPackages={refetchPackages}
              expandedPackageId={expandedPackageId}
              setExpandedPackageId={setExpandedPackageId}
              setIsAddPackageOpen={setIsAddPackageOpen}
              setIsRenewPackageOpen={setIsRenewPackageOpen}
              setEditPackage={setEditPackage}
              setRenewPackageId={setRenewPackageId}
              setDeletePackageId={setDeletePackageId}
              studentId={id!}
              teacherId={student.teacher_id || ''}
            />
          </TabsContent>

          {/* Lessons Tab - Unified view identical for admin & teacher */}
          <TabsContent value="lessons">
            <StudentLessonsView
              studentId={id!}
              studentName={student.name}
              walletBalance={student.wallet_balance || 0}
              role="admin"
            />
          </TabsContent>

          {/* Student Information Tab */}
          <TabsContent value="edit">
            <StudentInfoView student={student} role="admin" />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
