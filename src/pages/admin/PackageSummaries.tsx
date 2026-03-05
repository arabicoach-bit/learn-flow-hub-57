import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePackages, usePackageSummary, useAutoCompletePackages, PackageSummary } from '@/hooks/use-package-summary';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
import { FileText, Download, Copy, Search, Loader2, CheckCircle2, XCircle, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PackageSummaries() {
  const [statusFilter, setStatusFilter] = useState<string>('Completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextPackage, setNextPackage] = useState({
    startDate: '',
    lessons: '',
    duration: '',
    fees: '',
  });

  const { data: packages, isLoading } = usePackages({ 
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: summary, isLoading: summaryLoading } = usePackageSummary(selectedPackageId);
  const autoComplete = useAutoCompletePackages();

  // Auto-run package completion check on page load (silent)
  useEffect(() => {
    autoComplete.mutate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (summary) {
      setNextPackage({
        startDate: summary.completed_date
          ? format(addDays(new Date(summary.completed_date), 1), 'yyyy-MM-dd')
          : '',
        lessons: summary.lessons_purchased.toString(),
        duration: summary.lessons[0]?.duration_minutes?.toString() || '45',
        fees: summary.amount.toString(),
      });
    }
  }, [summary]);

  const handleViewSummary = (packageId: string) => {
    setSelectedPackageId(packageId);
    setIsModalOpen(true);
  };

  const generateSummaryText = (summary: PackageSummary): string => {
    const lines = [
      `📋 PACKAGE COMPLETION SUMMARY`,
      `═══════════════════════════════`,
      ``,
      `👤 Student: ${summary.student_name}`,
      `📞 Phone: ${summary.student_phone}`,
      summary.parent_phone ? `👨‍👩‍👧 Parent: ${summary.parent_phone}` : '',
      summary.teacher_name ? `👩‍🏫 Teacher: ${summary.teacher_name}` : '',
      ``,
      `💰 Package Details:`,
      `   Amount Paid: ${formatCurrency(summary.amount)}`,
      `   Lessons Purchased: ${summary.lessons_purchased}`,
      `   Lessons Used: ${summary.lessons_used}`,
      `   Payment Date: ${summary.payment_date ? formatDate(summary.payment_date) : 'N/A'}`,
      summary.completed_date ? `   Completed: ${formatDate(summary.completed_date)}` : '',
      ``,
      `📊 Statistics:`,
      `   ✅ Completed: ${summary.statistics.total_completed}`,
      `   ❌ Absent: ${summary.statistics.total_absent}`,
      ``,
      `📅 Lesson History:`,
      `───────────────────────────────`,
    ];

    if (summary.lessons.length > 0) {
      summary.lessons.forEach((lesson, idx) => {
        const statusIcon = lesson.status === 'completed' ? '✅' : lesson.status === 'absent' ? '❌' : '🕐';
        lines.push(`${idx + 1}. ${lesson.date ? formatDate(lesson.date) : 'N/A'} - ${statusIcon} ${lesson.status}`);
        lines.push(`   Time: ${lesson.scheduled_time?.slice(0, 5) || '-'} | Duration: ${lesson.duration_minutes || '-'} min`);
        if (lesson.notes) lines.push(`   Notes: ${lesson.notes}`);
      });
    } else {
      lines.push(`   No lessons recorded.`);
    }

    if (nextPackage.startDate || nextPackage.lessons) {
      lines.push(``, `📦 Next Package Proposal:`);
      if (nextPackage.startDate) lines.push(`   Start Date: ${nextPackage.startDate}`);
      if (nextPackage.lessons) lines.push(`   Lessons: ${nextPackage.lessons}`);
      if (nextPackage.duration) lines.push(`   Duration: ${nextPackage.duration} min`);
      if (nextPackage.fees) lines.push(`   Fees: AED ${nextPackage.fees}`);
    }

    lines.push(``, `═══════════════════════════════`);
    lines.push(`Generated on ${new Date().toLocaleDateString()}`);

    return lines.filter(l => l !== '').join('\n');
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    const text = generateSummaryText(summary);
    await navigator.clipboard.writeText(text);
    toast.success('Summary copied to clipboard!');
  };

  const handleExportPDF = async (np: typeof nextPackage) => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const navy: [number, number, number] = [45, 53, 97];
    const gold: [number, number, number] = [245, 197, 24];
    const lightGray: [number, number, number] = [248, 249, 250];
    const darkText: [number, number, number] = [26, 26, 46];

    // ── HEADER WITH LOGO ──
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

    // Gold line
    doc.setDrawColor(...gold);
    doc.setLineWidth(1.5);
    doc.line(14, 48, pageWidth - 14, 48);

    let y = 55;

    // ── STUDENT INFO ──
    doc.setFillColor(...navy);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Student Information', 18, y + 6);
    y += 14;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkText);

    const infoLine = (label: string, value: string, x: number, yPos: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, x + doc.getTextWidth(label) + 2, yPos);
    };

    infoLine('Student Name: ', summary.student_name, 18, y);
    infoLine('Teacher: ', summary.teacher_name || summary.lessons[0]?.teacher_name || 'N/A', 110, y);
    y += 6;
    infoLine('Phone: ', summary.student_phone, 18, y);
    y += 6;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const scheduleText = summary.weekly_schedule?.length > 0
      ? summary.weekly_schedule
          .map(s => `${dayNames[s.day_of_week]} ${s.time_slot?.slice(0,5)}`)
          .join('  |  ')
      : 'N/A';
    infoLine('Schedule: ', scheduleText, 18, y);
    y += 12;

    // ── PACKAGE DETAILS ──
    doc.setFillColor(...navy);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Package Details', 18, y + 6);
    y += 14;

    doc.setFontSize(9);
    doc.setTextColor(...darkText);

    const firstLessonDate = summary.lessons.length > 0 && summary.lessons[0].date
      ? formatDate(summary.lessons[0].date) : 'N/A';

    const lastLesson = [...summary.lessons]
      .filter(l => l.status !== 'scheduled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const endDate = lastLesson ? formatDate(lastLesson.date) : 'N/A';

    infoLine('Package Start: ', firstLessonDate, 18, y);
    infoLine('Package End: ', endDate, 110, y);
    y += 6;
    infoLine('Description: ', summary.description || 'N/A', 18, y);
    y += 6;
    const scheduleText2 = summary.weekly_schedule?.length > 0
      ? summary.weekly_schedule
          .map(s => `${dayNames[s.day_of_week]} ${s.time_slot?.slice(0,5)}`)
          .join('  |  ')
      : 'N/A';
    infoLine('Weekly Schedule: ', scheduleText2, 18, y);
    y += 12;

    // ── ATTENDANCE SUMMARY BOXES ──
    const totalLessons = summary.lessons.length;
    const completedCount = summary.statistics.total_completed;
    const absentCount = summary.statistics.total_absent;
    const scheduledCount = summary.lessons.filter(l => l.status === 'scheduled').length;
    const totalDone = completedCount + absentCount;
    const completedPct = totalDone > 0 ? Math.round(completedCount / totalDone * 100) : 0;
    const absentPct = totalDone > 0 ? Math.round(absentCount / totalDone * 100) : 0;
    const scheduledPct = totalLessons > 0 ? Math.round(scheduledCount / totalLessons * 100) : 0;

    const boxW = (pageWidth - 28 - 8) / 3;
    const boxH = 24;

    // Green - Completed
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.rect(14, y, boxW, boxH, 'FD');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`${completedCount}`, 14 + boxW/2, y + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`${completedPct}%`, 14 + boxW/2, y + 15, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Completed', 14 + boxW/2, y + 21, { align: 'center' });

    // Red - Absent
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

    // Blue - Scheduled
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
    doc.text('Scheduled', b3x + boxW/2, y + 21, { align: 'center' });

    y += boxH + 10;

    // ── LESSON RECORD TABLE ──
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
          lesson.status === 'completed' ? 'Completed' :
          lesson.status === 'absent' ? 'Absent' : 'Scheduled',
          lesson.notes || '-',
        ]),
        headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: darkText },
        alternateRowStyles: { fillColor: lightGray },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 28 },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 30 },
          5: { cellWidth: 'auto' },
        },
        styles: { fontSize: 8 },
      });

      y = (doc as any).lastAutoTable?.finalY || y + 10;
      y += 8;
    }

    // ── FOOTER ──
    const footerY = Math.max(y + 10, doc.internal.pageSize.getHeight() - 20);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(14, footerY, pageWidth - 14, footerY);

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing OAC Academy', 14, footerY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, footerY + 6, { align: 'right' });

    doc.save(`OAC_Summary_${summary.student_name.replace(/\s+/g, '_')}_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'absent': return 'Absent';
      case 'scheduled': return 'Scheduled';
      default: return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Package Summaries</h1>
          <p className="text-muted-foreground">Generate and export completion reports for parents</p>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoComplete.mutate(false)}
                disabled={autoComplete.isPending}
                className="gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                {autoComplete.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Check & Complete Packages
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Packages List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : packages?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No packages found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages?.map((pkg) => (
                      <TableRow key={pkg.package_id}>
                        <TableCell className="font-medium">
                          {pkg.students?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {(pkg.students as any)?.teachers?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {pkg.lessons_used} / {pkg.lessons_purchased}
                        </TableCell>
                        <TableCell>{formatCurrency(pkg.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={pkg.status === 'Completed' ? 'default' : 'secondary'}>
                            {pkg.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pkg.completed_date ? formatDate(pkg.completed_date) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSummary(pkg.package_id)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                  <h3 className="font-semibold mb-2">Student Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {summary.student_name}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {summary.student_phone}</div>
                    {summary.parent_phone && (
                      <div><span className="text-muted-foreground">Parent:</span> {summary.parent_phone}</div>
                    )}
                    {summary.teacher_name && (
                      <div><span className="text-muted-foreground">Teacher:</span> {summary.teacher_name}</div>
                    )}
                  </div>
                </div>

                {/* Package Details */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <h3 className="font-semibold mb-2">Package Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Amount:</span> {formatCurrency(summary.amount)}</div>
                    <div><span className="text-muted-foreground">Lessons:</span> {summary.lessons_used}/{summary.lessons_purchased}</div>
                    <div><span className="text-muted-foreground">Payment:</span> {summary.payment_date ? formatDate(summary.payment_date) : 'N/A'}</div>
                    <div><span className="text-muted-foreground">Completed:</span> {summary.completed_date ? formatDate(summary.completed_date) : 'N/A'}</div>
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
                    <div className="text-2xl font-bold text-blue-500">
                      {summary.lessons_purchased > 0
                        ? Math.round((summary.statistics.total_completed / summary.lessons_purchased) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                  </div>
                </div>

                {/* Lessons Table */}
                {summary.lessons.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Lesson History</h3>
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
                              <TableCell>{lesson.duration_minutes ? `${lesson.duration_minutes} min` : '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(lesson.status)}
                                  <span>{getStatusLabel(lesson.status)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate">{lesson.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Next Package Proposal */}
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Next Package Proposal
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Auto-filled from current package. Edit before exporting.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input
                        type="date"
                        value={nextPackage.startDate}
                        onChange={(e) => setNextPackage(p => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Number of Lessons</label>
                      <Input
                        type="number"
                        value={nextPackage.lessons}
                        onChange={(e) => setNextPackage(p => ({ ...p, lessons: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duration (minutes)</label>
                      <Input
                        type="number"
                        value={nextPackage.duration}
                        onChange={(e) => setNextPackage(p => ({ ...p, duration: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Package Fees (AED)</label>
                      <Input
                        type="number"
                        value={nextPackage.fees}
                        onChange={(e) => setNextPackage(p => ({ ...p, fees: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={() => handleExportPDF(nextPackage)} className="bg-[#2D3561] hover:bg-[#2D3561]/90">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={handleCopySummary} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Summary not found</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
