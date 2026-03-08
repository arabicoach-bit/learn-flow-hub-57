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
import { Copy, Loader2, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { usePackages, type Package } from '@/hooks/use-packages';
import { usePackageSummary } from '@/hooks/use-package-summary';
import type { PackageSummary } from '@/hooks/use-package-summary';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EditPackageDialog } from '@/components/packages/EditPackageDialog';
import { useTeachers } from '@/hooks/use-teachers';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
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

function WalletCell({
  packageId, total, status, onComplete
}: {
  packageId: string;
  total: number;
  status: string;
  onComplete: () => void;
}) {
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from('scheduled_lessons')
      .select('scheduled_lesson_id', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .in('status', ['completed', 'absent'])
      .then(async ({ count: c }) => {
        const usedCount = c ?? 0;
        setUsed(usedCount);
        const remaining = Math.max(0, total - usedCount);
        if (remaining === 0 && status !== 'Completed') {
          await supabase
            .from('packages')
            .update({
              status: 'Completed',
              completed_date: new Date().toISOString()
            })
            .eq('package_id', packageId);
          onComplete();
        }
      });
  }, [packageId, total, status]);
  if (used === null) return (
    <TableCell className="text-center text-muted-foreground">...</TableCell>
  );
  const remaining = Math.max(0, total - used);
  return (
    <TableCell className="text-center">
      <span className={remaining <= 2
        ? 'text-red-500 font-bold'
        : 'text-emerald-500 font-medium'}>
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
  const [filter, setFilter] = useState<YearMonthFilterValue>({ year: null, month: null });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [editPackage, setEditPackage] = useState<Package | null>(null);
  const [summaryPkg, setSummaryPkg] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = usePackageSummary(summaryPkg);

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
  const completedCount = filteredPackages
    .filter(p => p.status === 'Completed').length;

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
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('packages')
        .update({
          payment_status: 'Paid',
          payment_received: true,
          paid_date: now,
          payment_date: now,
        })
        .eq('package_id', pkg.package_id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`Marked as Paid for ${pkg.students?.name}`);
    } catch (error: any) {
      toast.error('Failed to update payment', {
        description: error.message
      });
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



  const handleCopySummary = async () => {
    if (!summary) return;
    const lines = [
      `Student: ${summary.student_name}`,
      `Teacher: ${summary.teacher_name || 'N/A'}`,
      `Phone: ${summary.student_phone}`,
      `Completed: ${summary.statistics.total_completed}`,
      `Absent: ${summary.statistics.total_absent}`,
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Copied to clipboard!');
  };

  const handleExportPDF = async () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const navy: [number,number,number] = [45, 53, 97];
    const gold: [number,number,number] = [245, 197, 24];
    const darkText: [number,number,number] = [26, 26, 46];

    const loadImage = (src: string): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = src;
      });

    const logoData = await loadImage('/oac-logo.png');
    if (logoData) doc.addImage(logoData, 'PNG', 14, 8, 35, 35);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('OAC Academy', 55, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gold);
    doc.text('Online Arabic Courses', 55, 28);

    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Package Summary Report', 55, 35);

    doc.setDrawColor(...gold);
    doc.setLineWidth(1.5);
    doc.line(14, 48, pageWidth - 14, 48);

    const reportMonth = format(new Date(), 'MMM yyyy');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Report Period: ${reportMonth}   |   Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`,
      pageWidth / 2, 53, { align: 'center' }
    );

    let y = 60;

    // Student Info
    doc.setFillColor(...navy);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Student Information', 18, y + 6);
    y += 14;

    const infoLine = (label: string, value: string, x: number, yPos: number) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(label, x, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, x + doc.getTextWidth(label) + 2, yPos);
    };

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const scheduleText = summary.weekly_schedule?.length > 0
      ? summary.weekly_schedule.map(s => `${dayNames[s.day_of_week]} ${s.time_slot?.slice(0,5)}`).join('  |  ')
      : 'N/A';

    infoLine('Student Name: ', summary.student_name, 18, y);
    infoLine('Teacher: ', summary.teacher_name || 'N/A', 110, y);
    y += 6;
    infoLine('Phone: ', summary.student_phone, 18, y);
    y += 6;
    infoLine('Schedule: ', scheduleText, 18, y);
    y += 12;

    // Package Details
    doc.setFillColor(...navy);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Package Details', 18, y + 6);
    y += 14;

    const firstLessonDate = summary.lessons.length > 0 && summary.lessons[0].date
      ? formatDate(summary.lessons[0].date) : 'N/A';

    const lastLesson = [...summary.lessons]
      .filter(l => l.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const endDateVal = lastLesson ? formatDate(lastLesson.date) : 'N/A';

    const descText = summary.description
      || (summaryPkg
        ? (filteredPackages.find(p => p.package_id === summaryPkg) as any)?.description
        : null)
      || 'N/A';

    infoLine('Start Date: ', firstLessonDate, 18, y);
    infoLine('End Date: ', endDateVal, 110, y);
    y += 6;
    infoLine('Description: ', descText, 18, y);
    y += 6;
    infoLine('Weekly Schedule: ', scheduleText, 18, y);
    y += 12;

    // Stats boxes
    const totalLessons = summary.lessons.length;
    const completedCount2 = summary.statistics.total_completed;
    const absentCount = summary.statistics.total_absent;
    const scheduledCount = summary.lessons.filter(l => l.status === 'scheduled').length;
    const completedPct = totalLessons > 0 ? Math.round(completedCount2 / totalLessons * 100) : 0;
    const absentPct = totalLessons > 0 ? Math.round(absentCount / totalLessons * 100) : 0;
    const scheduledPct = totalLessons > 0 ? Math.round(scheduledCount / totalLessons * 100) : 0;

    const boxW = (pageWidth - 28 - 8) / 3;
    const boxH = 24;

    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.rect(14, y, boxW, boxH, 'FD');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`${completedCount2}`, 14 + boxW/2, y + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${completedPct}%`, 14 + boxW/2, y + 15, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Completed', 14 + boxW/2, y + 21, { align: 'center' });

    const b2x = 14 + boxW + 4;
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(239, 68, 68);
    doc.rect(b2x, y, boxW, boxH, 'FD');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`${absentCount}`, b2x + boxW/2, y + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${absentPct}%`, b2x + boxW/2, y + 15, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Absent', b2x + boxW/2, y + 21, { align: 'center' });

    const b3x = b2x + boxW + 4;
    doc.setFillColor(219, 234, 254);
    doc.setDrawColor(59, 130, 246);
    doc.rect(b3x, y, boxW, boxH, 'FD');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`${scheduledCount}`, b3x + boxW/2, y + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${scheduledPct}%`, b3x + boxW/2, y + 15, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Upcoming', b3x + boxW/2, y + 21, { align: 'center' });

    y += boxH + 10;

    // Lesson Record
    if (summary.lessons.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text('Lesson Record', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Time', 'Duration', 'Status', 'Notes']],
        body: summary.lessons.map((lesson, idx) => [
          idx + 1,
          lesson.date ? formatDate(lesson.date) : 'N/A',
          lesson.scheduled_time?.slice(0, 5) || '-',
          lesson.duration_minutes ? `${lesson.duration_minutes} min` : '-',
          lesson.status === 'completed' ? 'Completed' : lesson.status === 'absent' ? 'Absent' : 'Upcoming',
          lesson.notes?.trim() || '',
        ]),
        headStyles: {
          fillColor: navy,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: darkText,
          cellPadding: 4,
          minCellHeight: 10,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 28 },
          5: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.raw as string;
            const color: [number,number,number] =
              status === 'Completed' ? [22, 163, 74]
              : status === 'Absent' ? [220, 38, 38]
              : [37, 99, 235];
            doc.setTextColor(...color);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text(status, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 3);
            doc.setTextColor(...darkText);
            doc.setFont('helvetica', 'normal');
          }
        },
        styles: {
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
      });

      y = (doc as any).lastAutoTable?.finalY || y + 10;
      y += 8;
    }

    // Teacher Notes
    const lessonNotes = summary.lessons
      .filter(l => l.notes?.trim())
      .map((l, i) => `${i + 1}. ${l.date ? formatDate(l.date) : ''}: ${l.notes}`);

    if (lessonNotes.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text('Teacher Notes', 14, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkText);
      lessonNotes.forEach(note => {
        const lines = doc.splitTextToSize(note, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5;
      });
      y += 6;
    }

    // Footer
    const footerY = Math.max(y + 10, doc.internal.pageSize.getHeight() - 25);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing OAC Academy', 14, footerY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, footerY + 6, { align: 'right' });
    doc.setFontSize(7);
    doc.text('This report excludes financial information.', 14, footerY + 12);

    doc.save(`${summary.student_name.replace(/\s+/g, '_')}_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success('PDF exported!');
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-emerald-600">{formatCurrency(paidRev)}</div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-amber-600">{formatCurrency(pendingRev)}</div>
            <p className="text-xs text-muted-foreground">Pending Payments</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-green-600">{runningCount}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-slate-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold">{filteredPackages.length}</div>
            <p className="text-xs text-muted-foreground">Total Packages</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-blue-600">{renewalCount}</div>
            <p className="text-xs text-muted-foreground">Renewals</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-purple-600">{newCount}</div>
            <p className="text-xs text-muted-foreground">New</p>
          </CardContent></Card>
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
                      <TableHead>Description</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate"
                          title={(pkg as any).description || ''}>
                          {(pkg as any).description || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={pkg.status === 'Active' ? 'default' : 'secondary'} className={pkg.status === 'Active' ? 'bg-green-600' : ''}>
                            {pkg.status === 'Active' ? 'Running' : pkg.status}
                          </Badge>
                        </TableCell>
                        <LessonsCell 
                          packageId={pkg.package_id}
                          total={pkg.lessons_purchased} />
                        <WalletCell
                          packageId={pkg.package_id}
                          total={pkg.lessons_purchased}
                          status={pkg.status}
                          onComplete={() => queryClient.invalidateQueries({ queryKey: ['packages'] })}
                        />
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
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditPackage(pkg); 
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSummaryPkg(pkg.package_id);
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

      <EditPackageDialog
        package_={editPackage}
        open={!!editPackage}
        onOpenChange={(open) => !open && setEditPackage(null)}
        onSuccess={() => {
          setEditPackage(null);
          queryClient.invalidateQueries({ queryKey: ['packages'] });
        }}
      />

      {/* Package Summary Dialog */}
      <Dialog open={!!summaryPkg} onOpenChange={(o) => !o && setSummaryPkg(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Package Summary
            </DialogTitle>
          </DialogHeader>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="space-y-1 text-sm">
                  <div><span className="font-semibold text-muted-foreground">Student:</span> {summary.student_name}</div>
                  <div><span className="font-semibold text-muted-foreground">Teacher:</span> {summary.teacher_name || '—'}</div>
                  <div><span className="font-semibold text-muted-foreground">Phone:</span> {summary.student_phone}</div>
                  <div><span className="font-semibold text-muted-foreground">Description:</span> {summary.description || (summaryPkg ? (filteredPackages.find(p => p.package_id === summaryPkg) as any)?.description : null) || '—'}</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-2xl font-bold text-emerald-500">{summary.statistics.total_completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                  <div className="text-2xl font-bold text-destructive">{summary.statistics.total_absent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-2xl font-bold text-blue-500">{summary.lessons.filter(l => l.status === 'scheduled').length}</div>
                  <div className="text-xs text-muted-foreground">Upcoming</div>
                </div>
              </div>

              {/* Lessons Table */}
              {summary.lessons.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.lessons.map((lesson, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{lesson.date ? formatDate(lesson.date) : 'N/A'}</TableCell>
                          <TableCell>{lesson.scheduled_time?.slice(0, 5) || '-'}</TableCell>
                          <TableCell>{lesson.duration_minutes ? `${lesson.duration_minutes}m` : '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {lesson.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                               lesson.status === 'absent' ? <XCircle className="w-4 h-4 text-destructive" /> :
                               <Clock className="w-4 h-4 text-blue-500" />}
                              <span>{lesson.status === 'completed' ? 'Done' : lesson.status === 'absent' ? 'Absent' : 'Upcoming'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">{lesson.notes || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button onClick={handleExportPDF} className="bg-[#2D3561] hover:bg-[#2D3561]/90">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleCopySummary} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">Summary not found</div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
