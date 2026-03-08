import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, MessageCircle, Download, Copy, User, BookOpen, Phone, Calendar, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { PackageSummary } from '@/hooks/use-package-summary';
import { formatDate } from '@/lib/wallet-utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PackageSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: PackageSummary | null | undefined;
  isLoading: boolean;
  fallbackDescription?: string | null;
}

export function PackageSummaryDialog({ open, onOpenChange, summary, isLoading, fallbackDescription }: PackageSummaryDialogProps) {
  if (!open) return null;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getStats = () => {
    if (!summary) return { totalLessons: 0, completed: 0, absent: 0, scheduled: 0, totalDone: 0, progressPct: 0, completedPct: 0, absentPct: 0, scheduledPct: 0 };
    const totalLessons = summary.lessons.length;
    const completed = summary.statistics.total_completed;
    const absent = summary.statistics.total_absent;
    const scheduled = summary.lessons.filter(l => l.status === 'scheduled').length;
    const totalDone = completed + absent;
    return {
      totalLessons, completed, absent, scheduled, totalDone,
      progressPct: totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0,
      completedPct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
      absentPct: totalLessons > 0 ? Math.round((absent / totalLessons) * 100) : 0,
      scheduledPct: totalLessons > 0 ? Math.round((scheduled / totalLessons) * 100) : 0,
    };
  };

  const generateWhatsAppText = (): string => {
    if (!summary) return '';
    const stats = getStats();
    const scheduleText = summary.weekly_schedule?.length > 0
      ? summary.weekly_schedule.map(d => `${dayNames[d.day_of_week]} ${d.time_slot?.slice(0,5)}`).join(', ')
      : '';
    const firstDate = summary.lessons.length > 0 && summary.lessons[0].date ? formatDate(summary.lessons[0].date) : '';
    const lastLesson = [...summary.lessons].filter(l => l.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const endDate = lastLesson ? formatDate(lastLesson.date) : '';

    let msg = `📋 *OAC Academy - Package Summary*\n\n`;
    msg += `👤 *Student:* ${summary.student_name}\n`;
    if (summary.teacher_name) msg += `👨‍🏫 *Teacher:* ${summary.teacher_name}\n`;
    if (scheduleText) msg += `📅 *Schedule:* ${scheduleText}\n`;
    const desc = summary.description || fallbackDescription;
    if (desc) msg += `📝 *Description:* ${desc}\n`;
    msg += `\n`;
    if (firstDate) msg += `🗓️ *Start:* ${firstDate}\n`;
    if (endDate) msg += `🏁 *End:* ${endDate}\n`;
    msg += `\n📊 *Attendance Summary*\n`;
    msg += `✅ Completed: ${stats.completed} (${stats.completedPct}%)\n`;
    msg += `❌ Absent: ${stats.absent} (${stats.absentPct}%)\n`;
    msg += `🕐 Scheduled: ${stats.scheduled} (${stats.scheduledPct}%)\n\n`;

    if (summary.lessons.length > 0) {
      msg += `📖 *Lesson Record*\n`;
      summary.lessons.forEach((l, i) => {
        const icon = l.status === 'completed' ? '✅' : l.status === 'absent' ? '❌' : '🕐';
        const date = l.date ? formatDate(l.date) : 'TBD';
        const time = l.scheduled_time?.slice(0, 5) || '';
        msg += `${i + 1}. ${date} ${time} ${icon}`;
        if (l.notes?.trim()) msg += ` - ${l.notes.trim()}`;
        msg += `\n`;
      });
      msg += `\n`;
    }
    msg += `Thank you for choosing OAC Academy! 🌟`;
    return msg;
  };

  const handleShareWhatsApp = () => {
    if (!summary) return;
    const phone = (summary.parent_phone || summary.student_phone || '').replace(/[^0-9+]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(generateWhatsAppText())}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateWhatsAppText());
    toast.success('Copied to clipboard!');
  };

  const handleExportPDF = async () => {
    if (!summary) return;
    const stats = getStats();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentW = pageWidth - 28;
    const navy: [number,number,number] = [45, 53, 97];
    const gold: [number,number,number] = [245, 197, 24];
    const darkText: [number,number,number] = [26, 26, 46];
    const green: [number,number,number] = [34, 197, 94];
    const red: [number,number,number] = [239, 68, 68];
    const blue: [number,number,number] = [59, 130, 246];

    const loadImage = (src: string): Promise<string> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d')?.drawImage(img, 0, 0); resolve(c.toDataURL('image/png')); };
        img.onerror = () => resolve('');
        img.src = src;
      });

    const logoData = await loadImage('/oac-logo.png');
    if (logoData) doc.addImage(logoData, 'PNG', 14, 8, 35, 35);

    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
    doc.text('OAC Academy', 55, 20);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gold);
    doc.text('Online Arabic Courses', 55, 28);
    doc.setFontSize(9); doc.setTextColor(128, 128, 128);
    doc.text('Package Summary Report', 55, 35);

    doc.setDrawColor(...gold); doc.setLineWidth(1.5);
    doc.line(14, 48, pageWidth - 14, 48);
    doc.setFontSize(8); doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth / 2, 53, { align: 'center' });

    let y = 60;
    const infoLine = (label: string, value: string, x: number, yPos: number) => {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...darkText);
      doc.text(label, x, yPos); doc.setFont('helvetica', 'normal');
      doc.text(value, x + doc.getTextWidth(label) + 2, yPos);
    };

    // Student Info
    doc.setFillColor(...navy); doc.rect(14, y, contentW, 8, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Student Information', 18, y + 6); y += 14;
    infoLine('Student Name: ', summary.student_name, 18, y);
    infoLine('Teacher: ', summary.teacher_name || 'N/A', 110, y); y += 6;
    infoLine('Phone: ', summary.student_phone, 18, y); y += 10;

    // Weekly Schedule
    if (summary.weekly_schedule?.length > 0) {
      doc.setFillColor(245, 247, 250); doc.setDrawColor(210, 215, 225); doc.setLineWidth(0.3);
      doc.rect(14, y, contentW, 14, 'FD');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(128, 128, 128);
      doc.text('WEEKLY SCHEDULE', 18, y + 5);
      const schedItems = summary.weekly_schedule.sort((a, b) => a.day_of_week - b.day_of_week)
        .map(s => `${dayNames[s.day_of_week]} ${s.time_slot?.slice(0,5)}`);
      let schedX = 18;
      schedItems.forEach(item => {
        const tw = doc.getTextWidth(item) + 6;
        doc.setFillColor(...navy); doc.roundedRect(schedX, y + 7, tw, 5.5, 1.5, 1.5, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text(item, schedX + 3, y + 11.5); schedX += tw + 3;
      });
      y += 20;
    }

    // Package Details
    doc.setFillColor(...navy); doc.rect(14, y, contentW, 8, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Package Details', 18, y + 6); y += 14;
    const firstDate = summary.lessons.length > 0 && summary.lessons[0].date ? formatDate(summary.lessons[0].date) : 'N/A';
    const lastLesson = [...summary.lessons].filter(l => l.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const endDateVal = lastLesson ? formatDate(lastLesson.date) : 'N/A';
    const descText = summary.description || fallbackDescription || 'N/A';
    infoLine('Start Date: ', firstDate, 18, y); infoLine('End Date: ', endDateVal, 110, y); y += 6;
    infoLine('Description: ', descText, 18, y); y += 10;

    // Progress Bar
    doc.setFillColor(235, 238, 245); doc.roundedRect(14, y, contentW, 8, 2, 2, 'F');
    const fillW = Math.max(0, (stats.progressPct / 100) * contentW);
    if (fillW > 0) { doc.setFillColor(...navy); doc.roundedRect(14, y, fillW, 8, 2, 2, 'F'); }
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    if (fillW > 25) doc.text(`${stats.progressPct}% Complete`, 14 + fillW / 2, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(128, 128, 128);
    doc.text(`${stats.totalDone} / ${stats.totalLessons} lessons used`, pageWidth - 14, y + 5.5, { align: 'right' });
    y += 14;

    // 3 Stat Boxes
    const boxW = (contentW - 6) / 3; const boxH = 24;
    const boxes: { x: number; bg: [number,number,number]; color: [number,number,number]; count: number; pct: number; label: string }[] = [
      { x: 14, bg: [220, 252, 231], color: green, count: stats.completed, pct: stats.completedPct, label: 'COMPLETED' },
      { x: 14 + boxW + 3, bg: [254, 226, 226], color: red, count: stats.absent, pct: stats.absentPct, label: 'ABSENT' },
      { x: 14 + (boxW + 3) * 2, bg: [219, 234, 254], color: blue, count: stats.scheduled, pct: stats.scheduledPct, label: 'SCHEDULED' },
    ];
    boxes.forEach(({ x, bg, color, count, pct, label }) => {
      doc.setFillColor(...bg); doc.setDrawColor(...color); doc.setLineWidth(0.5);
      doc.rect(x, y, boxW, boxH, 'FD');
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
      doc.text(`${count}`, x + boxW / 2, y + 9, { align: 'center' });
      doc.setFontSize(8); doc.text(`${pct}%`, x + boxW / 2, y + 15, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(label, x + boxW / 2, y + 21, { align: 'center' });
    });
    y += boxH + 8;

    // Timeline
    if (stats.totalLessons > 0) {
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(128, 128, 128);
      doc.text('LESSON TIMELINE', 18, y); y += 4;
      const dotSize = 5; const dotGap = 1.5;
      const dotsPerRow = Math.floor(contentW / (dotSize + dotGap));
      let dx = 14;
      summary.lessons.forEach((lesson, idx) => {
        const color: [number,number,number] = lesson.status === 'completed' ? green : lesson.status === 'absent' ? red : blue;
        doc.setFillColor(...color); doc.roundedRect(dx, y, dotSize, dotSize, 1, 1, 'F');
        doc.setFontSize(5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text(`${idx + 1}`, dx + dotSize / 2, y + 3.5, { align: 'center' });
        dx += dotSize + dotGap;
        if ((idx + 1) % dotsPerRow === 0) { dx = 14; y += dotSize + dotGap; }
      });
      y += dotSize + 4;
      let lx = 14;
      [{ color: green, label: 'Completed' }, { color: red, label: 'Absent' }, { color: blue, label: 'Scheduled' }].forEach(({ color, label }) => {
        doc.setFillColor(...color); doc.rect(lx, y, 3, 3, 'F');
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text(label, lx + 5, y + 2.5); lx += doc.getTextWidth(label) + 12;
      });
      y += 10;
    }

    // Lesson Record Table
    if (summary.lessons.length > 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
      doc.text('Lesson Record', 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Time', 'Duration', 'Status', 'Notes']],
        body: summary.lessons.map((l, i) => [
          i + 1, l.date ? formatDate(l.date) : 'N/A', l.scheduled_time?.slice(0, 5) || '-',
          l.duration_minutes ? `${l.duration_minutes} min` : '-',
          l.status === 'completed' ? 'Completed' : l.status === 'absent' ? 'Absent' : 'Scheduled',
          l.notes?.trim() || '',
        ]),
        headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 8, textColor: darkText, cellPadding: 3, minCellHeight: 8 },
        alternateRowStyles: { fillColor: [248, 249, 252] },
        columnStyles: { 0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' }, 1: { cellWidth: 28, fontStyle: 'bold' }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' }, 4: { cellWidth: 26 }, 5: { cellWidth: 'auto' } },
        didParseCell: (data) => { if (data.column.index === 4 && data.section === 'body') data.cell.text = []; },
        didDrawCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            const status = data.cell.raw as string;
            const color: [number,number,number] = status === 'Completed' ? [22, 163, 74] : status === 'Absent' ? [220, 38, 38] : [37, 99, 235];
            doc.setTextColor(...color); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
            doc.text(status, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 2.5);
            doc.setTextColor(...darkText); doc.setFont('helvetica', 'normal');
          }
        },
        styles: { overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.1 },
      });
      y = (doc as any).lastAutoTable?.finalY || y + 10;
      y += 6;
    }

    // Teacher Notes
    const lessonNotes = summary.lessons.filter(l => l.notes?.trim()).map((l, i) => `${i + 1}. ${l.date ? formatDate(l.date) : ''}: ${l.notes}`);
    if (lessonNotes.length > 0) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
      doc.text('Teacher Notes', 14, y); y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...darkText);
      lessonNotes.forEach(note => { const lines = doc.splitTextToSize(note, contentW); doc.text(lines, 14, y); y += lines.length * 4.5; });
      y += 4;
    }

    // Footer
    const footerY = Math.max(y + 10, doc.internal.pageSize.getHeight() - 25);
    doc.setDrawColor(...gold); doc.setLineWidth(0.5);
    doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(8); doc.setTextColor(128, 128, 128); doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing OAC Academy', 14, footerY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy')}`, pageWidth - 14, footerY + 6, { align: 'right' });
    doc.setFontSize(7);
    doc.text('This report excludes financial information.', 14, footerY + 12);

    doc.save(`${summary.student_name.replace(/\s+/g, '_')}_${format(new Date(), 'MMM_yyyy')}.pdf`);
    toast.success('PDF exported!');
  };

  const stats = summary ? getStats() : null;
  const descText = summary?.description || fallbackDescription || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Package Summary
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : summary && stats ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 p-4 rounded-xl bg-muted/30 border space-y-2">
                <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-primary" /><span className="font-bold text-foreground">{summary.student_name}</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="w-3.5 h-3.5" /><span>{summary.teacher_name || '—'}</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span>{summary.student_phone}</span></div>
                {descText && <div className="text-xs text-muted-foreground pt-1 border-t mt-2">{descText}</div>}
              </div>
              <div className="p-4 rounded-xl border bg-primary/5 flex flex-col items-center justify-center text-center">
                <div className="text-3xl font-bold text-primary">{stats.progressPct}%</div>
                <div className="text-xs text-muted-foreground mb-2">Package Progress</div>
                <Progress value={stats.progressPct} className="h-2 w-full" />
                <div className="text-xs text-muted-foreground mt-1.5">{stats.totalDone} / {stats.totalLessons} lessons used</div>
              </div>
            </div>

            {/* Schedule */}
            {summary.weekly_schedule?.length > 0 && (
              <div className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2"><Calendar className="w-3.5 h-3.5" />WEEKLY SCHEDULE</div>
                <div className="flex flex-wrap gap-2">
                  {summary.weekly_schedule.sort((a, b) => a.day_of_week - b.day_of_week).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-medium px-3 py-1">{dayNames[s.day_of_week]} {s.time_slot?.slice(0, 5)}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-xl font-bold text-emerald-500">{stats.completed}</div>
                <div className="text-xs text-emerald-600 font-medium">{stats.completedPct}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <div className="text-xl font-bold text-destructive">{stats.absent}</div>
                <div className="text-xs text-destructive font-medium">{stats.absentPct}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Absent</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-xl font-bold text-blue-500">{stats.scheduled}</div>
                <div className="text-xs text-blue-600 font-medium">{stats.scheduledPct}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Scheduled</div>
              </div>
            </div>

            {/* Timeline */}
            {stats.totalLessons > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" />LESSON TIMELINE</div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.lessons.map((lesson, idx) => {
                    const bgColor = lesson.status === 'completed' ? 'bg-emerald-500' : lesson.status === 'absent' ? 'bg-destructive' : 'bg-blue-400';
                    return (
                      <div key={idx} className={`w-6 h-6 rounded-md ${bgColor} flex items-center justify-center cursor-default transition-transform hover:scale-125`}
                        title={`${idx + 1}. ${lesson.date ? formatDate(lesson.date) : 'TBD'} - ${lesson.status}${lesson.notes ? ` (${lesson.notes})` : ''}`}>
                        <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completed</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Absent</div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Scheduled</div>
                </div>
              </div>
            )}

            {/* Lesson Record */}
            {summary.lessons.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lesson Record</div>
                <div className="overflow-x-auto rounded-lg border max-h-[240px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Date</TableHead><TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.lessons.map((lesson, idx) => (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>{lesson.date ? formatDate(lesson.date) : 'N/A'}</TableCell>
                          <TableCell>{lesson.scheduled_time?.slice(0, 5) || '-'}</TableCell>
                          <TableCell>{lesson.duration_minutes ? `${lesson.duration_minutes}m` : '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {lesson.status === 'completed' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> :
                               lesson.status === 'absent' ? <XCircle className="w-3 h-3 text-destructive" /> :
                               <Clock className="w-3 h-3 text-blue-500" />}
                              <span>{lesson.status === 'completed' ? 'Completed' : lesson.status === 'absent' ? 'Absent' : 'Scheduled'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate">{lesson.notes || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button onClick={handleShareWhatsApp} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                <MessageCircle className="w-4 h-4 mr-2" />Share via WhatsApp
              </Button>
              <Button onClick={handleExportPDF} className="bg-[#2D3561] hover:bg-[#2D3561]/90">
                <Download className="w-4 h-4 mr-2" />Export PDF
              </Button>
              <Button onClick={handleCopy} variant="outline">
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">Summary not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
