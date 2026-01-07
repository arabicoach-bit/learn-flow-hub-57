import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePackages, usePackageSummary, PackageSummary } from '@/hooks/use-package-summary';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
import { FileText, Download, Copy, Search, Loader2, CheckCircle2, XCircle, Clock, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PackageSummaries() {
  const [statusFilter, setStatusFilter] = useState<string>('Completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: packages, isLoading } = usePackages({ 
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: summary, isLoading: summaryLoading } = usePackageSummary(selectedPackageId);

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
      ``,
      `💰 Package Details:`,
      `   Amount Paid: ${formatCurrency(summary.amount)}`,
      `   Lessons Purchased: ${summary.lessons_purchased}`,
      `   Lessons Used: ${summary.lessons_used}`,
      `   Payment Date: ${summary.payment_date ? formatDate(summary.payment_date) : 'N/A'}`,
      summary.completed_date ? `   Completed: ${formatDate(summary.completed_date)}` : '',
      ``,
      `📊 Statistics:`,
      `   ✅ Taken: ${summary.statistics.total_taken}`,
      `   ❌ Absent: ${summary.statistics.total_absent}`,
      `   ⏸️ Cancelled: ${summary.statistics.total_cancelled}`,
      ``,
      `📅 Lesson History:`,
      `───────────────────────────────`,
    ];

    if (summary.lessons.length > 0) {
      summary.lessons.forEach((lesson, idx) => {
        const statusIcon = lesson.status === 'Taken' ? '✅' : lesson.status === 'Absent' ? '❌' : '⏸️';
        lines.push(`${idx + 1}. ${lesson.date ? formatDate(lesson.date) : 'N/A'} - ${statusIcon} ${lesson.status}`);
        lines.push(`   Class: ${lesson.class_name} | Teacher: ${lesson.teacher_name}`);
        if (lesson.notes) lines.push(`   Notes: ${lesson.notes}`);
      });
    } else {
      lines.push(`   No lessons recorded for this package.`);
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

  const handleWhatsApp = () => {
    if (!summary) return;
    const text = generateSummaryText(summary);
    const phone = summary.parent_phone || summary.student_phone;
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Package Completion Summary', pageWidth / 2, 20, { align: 'center' });

    // Student Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    let y = 35;

    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${summary.student_name}`, 14, y);
    y += 6;
    doc.text(`Phone: ${summary.student_phone}`, 14, y);
    y += 6;
    if (summary.parent_phone) {
      doc.text(`Parent Phone: ${summary.parent_phone}`, 14, y);
      y += 6;
    }

    // Package Details
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Package Details', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount Paid: ${formatCurrency(summary.amount)}`, 14, y);
    y += 6;
    doc.text(`Lessons Purchased: ${summary.lessons_purchased}`, 14, y);
    y += 6;
    doc.text(`Lessons Used: ${summary.lessons_used}`, 14, y);
    y += 6;
    doc.text(`Payment Date: ${summary.payment_date ? formatDate(summary.payment_date) : 'N/A'}`, 14, y);
    y += 6;
    if (summary.completed_date) {
      doc.text(`Completed Date: ${formatDate(summary.completed_date)}`, 14, y);
      y += 6;
    }

    // Statistics
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Statistics', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Taken: ${summary.statistics.total_taken}`, 14, y);
    doc.text(`Absent: ${summary.statistics.total_absent}`, 60, y);
    doc.text(`Cancelled: ${summary.statistics.total_cancelled}`, 110, y);
    y += 12;

    // Lessons Table
    if (summary.lessons.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Lesson History', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Class', 'Teacher', 'Status', 'Notes']],
        body: summary.lessons.map((lesson, idx) => [
          idx + 1,
          lesson.date ? formatDate(lesson.date) : 'N/A',
          lesson.class_name,
          lesson.teacher_name,
          lesson.status,
          lesson.notes || '-',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || y + 10;
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, finalY + 15, { align: 'center' });

    // Save
    doc.save(`package_summary_${summary.student_name.replace(/\s+/g, '_')}_${summary.package_id.slice(0, 8)}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Taken': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Absent': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'Cancelled': return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return null;
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
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Parent:</span> {summary.parent_phone}
                      </div>
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
                    <div className="text-2xl font-bold text-emerald-500">{summary.statistics.total_taken}</div>
                    <div className="text-xs text-muted-foreground">Taken</div>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                    <div className="text-2xl font-bold text-destructive">{summary.statistics.total_absent}</div>
                    <div className="text-xs text-muted-foreground">Absent</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted border text-center">
                    <div className="text-2xl font-bold">{summary.statistics.total_cancelled}</div>
                    <div className="text-xs text-muted-foreground">Cancelled</div>
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
                            <TableHead>Class</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.lessons.map((lesson, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{lesson.date ? formatDate(lesson.date) : 'N/A'}</TableCell>
                              <TableCell>{lesson.class_name}</TableCell>
                              <TableCell>{lesson.teacher_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(lesson.status)}
                                  <span>{lesson.status}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={handleCopySummary} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </Button>
                  <Button onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  {(summary.parent_phone || summary.student_phone) && (
                    <Button onClick={handleWhatsApp} variant="outline" className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  )}
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
