import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, ChevronRight } from 'lucide-react';
import { useCommentBank, useSaveTrialReport, useUpdateTrialReport, usePolishReport, useTrialReports } from '@/hooks/use-trial-reports';
import { generateTrialReportPdfWithLogo, type TrialReportPdfData } from '@/lib/trial-report-pdf';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ReportSelectStep } from './report/ReportSelectStep';
import { ReportPreviewStep } from './report/ReportPreviewStep';
import { ReportHistoryStep } from './report/ReportHistoryStep';

interface TrialReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialId: string;
  studentName: string;
  trialInfo?: {
    teacherName?: string;
    program?: string;
    trialDate?: string;
    trialTime?: string;
    duration?: number;
    age?: number | null;
    yearGroup?: string | null;
    gender?: string | null;
    phone?: string | null;
  };
}

export function TrialReportDialog({ open, onOpenChange, trialId, studentName, trialInfo }: TrialReportDialogProps) {
  const { data: commentBank = [], isLoading: bankLoading } = useCommentBank();
  const { data: existingReports = [] } = useTrialReports(trialId);
  const saveReport = useSaveTrialReport();
  const updateReport = useUpdateTrialReport();
  const polishReport = usePolishReport();

  const [step, setStep] = useState<'select' | 'preview' | 'history'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teacherNotes, setTeacherNotes] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [reportStatus, setReportStatus] = useState('draft');
  const [generatedReport, setGeneratedReport] = useState<{ reportId: string; text: string; isPolished: boolean; originalText: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);

  // Load latest existing report when dialog opens
  useEffect(() => {
    if (!open || commentBank.length === 0 || existingReports.length === 0) return;
    if (loadedReportId) return;

    const latest = existingReports[0];
    const savedComments = Array.isArray(latest.selected_comments) ? latest.selected_comments as any[] : [];

    const ids = new Set<string>();
    savedComments.forEach((c: any) => {
      if (c.commentId) {
        const exists = commentBank.find(bc => bc.comment_id === c.commentId);
        if (exists) ids.add(c.commentId);
      }
    });

    setSelectedIds(ids);
    setTeacherNotes(latest.teacher_notes || '');
    
    setReportStatus(latest.status || 'draft');
    setGeneratedReport({
      reportId: latest.report_id,
      text: latest.final_text,
      isPolished: !!latest.ai_polished_text,
      originalText: latest.final_text,
    });
    setLoadedReportId(latest.report_id);
    setStep('preview');
  }, [open, commentBank, existingReports, loadedReportId]);

  const selectedComments = useMemo(() =>
    commentBank.filter(c => selectedIds.has(c.comment_id)),
    [commentBank, selectedIds]
  );

  const toggleComment = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectionCounts = useMemo(() => ({
    rStr: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'strength').length,
    rNext: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'next_step').length,
    sStr: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'strength').length,
    sNext: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'next_step').length,
  }), [selectedComments]);

  const canGenerate = selectionCounts.rStr >= 1 && selectionCounts.rNext >= 1 && selectionCounts.sStr >= 1 && selectionCounts.sNext >= 1;

  const mapComments = () => selectedComments.map(c => ({
    commentId: c.comment_id,
    skill: c.skill,
    type: c.comment_type,
    text: c.comment_text,
  }));

  const handleGenerate = async () => {
    try {
      const mapped = mapComments();
      if (loadedReportId) {
        const result = await updateReport.mutateAsync({
          reportId: loadedReportId, trialId, selectedComments: mapped, studentName,
          teacherNotes: teacherNotes.trim() || undefined, gender: trialInfo?.gender || undefined,
        });
        setGeneratedReport({ reportId: result.report_id, text: result.final_text, isPolished: false, originalText: result.final_text });
        setStep('preview');
        toast.success('Report updated!');
      } else {
        const result = await saveReport.mutateAsync({
          trialId, selectedComments: mapped, studentName,
          teacherNotes: teacherNotes.trim() || undefined, gender: trialInfo?.gender || undefined,
        });
        setGeneratedReport({ reportId: result.report_id, text: result.final_text, isPolished: false, originalText: result.final_text });
        setLoadedReportId(result.report_id);
        setStep('preview');
        toast.success('Report generated!');
      }
    } catch (err: any) {
      toast.error('Failed to generate report', { description: err.message });
    }
  };

  const handleSaveEdits = async () => {
    if (!generatedReport || !loadedReportId) return;
    try {
      await updateReport.mutateAsync({
        reportId: loadedReportId, trialId, selectedComments: mapComments(), studentName,
        teacherNotes: teacherNotes.trim() || undefined, gender: trialInfo?.gender || undefined,
        finalText: generatedReport.text,
      });
      setGeneratedReport({ ...generatedReport, originalText: generatedReport.text });
      toast.success('Report saved!');
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    }
  };

  const handlePolish = async () => {
    if (!generatedReport) return;
    try {
      const polishedText = await polishReport.mutateAsync({
        reportId: generatedReport.reportId, trialId,
        templateText: generatedReport.text, studentName,
      });
      setGeneratedReport({ ...generatedReport, text: polishedText, isPolished: true, originalText: polishedText });
      toast.success('Report polished with AI!');
    } catch (err: any) {
      toast.error('Failed to polish report', { description: err.message });
    }
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime12h = (time: string | undefined) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const buildPdfData = (text: string, rawMode?: boolean): TrialReportPdfData => ({
    studentName,
    teacherName: trialInfo?.teacherName || 'N/A',
    program: trialInfo?.program || 'N/A',
    trialDate: trialInfo?.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A',
    trialTime: formatTime12h(trialInfo?.trialTime),
    duration: `${trialInfo?.duration || 30} minutes`,
    age: trialInfo?.age ? String(trialInfo.age) : '',
    yearGroup: trialInfo?.yearGroup || '',
    gender: trialInfo?.gender || '',
    readingStrengths: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'strength').map(c => c.comment_text),
    readingNextSteps: selectedComments.filter(c => c.skill === 'reading' && c.comment_type === 'next_step').map(c => c.comment_text),
    speakingStrengths: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'strength').map(c => c.comment_text),
    speakingNextSteps: selectedComments.filter(c => c.skill === 'speaking' && c.comment_type === 'next_step').map(c => c.comment_text),
    teacherNotes: teacherNotes.trim(),
    finalText: text,
    useRawText: rawMode,
    
  });

  const handleDownloadPdf = async (text?: string) => {
    const finalText = text || generatedReport?.text || '';
    const wasEdited = generatedReport ? finalText !== generatedReport.originalText : false;
    const pdfData = buildPdfData(finalText, wasEdited);
    const doc = await generateTrialReportPdfWithLogo(pdfData);
    doc.save(`Trial_Report_${studentName.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  const handleDownloadHistoryPdf = async (report: any) => {
    const comments = Array.isArray(report.selected_comments) ? report.selected_comments : [];
    const pdfData: TrialReportPdfData = {
      studentName,
      teacherName: trialInfo?.teacherName || 'N/A',
      program: trialInfo?.program || 'N/A',
      trialDate: trialInfo?.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A',
      trialTime: formatTime12h(trialInfo?.trialTime),
      duration: `${trialInfo?.duration || 30} minutes`,
      age: trialInfo?.age ? String(trialInfo.age) : '',
      yearGroup: trialInfo?.yearGroup || '',
      gender: trialInfo?.gender || '',
      readingStrengths: comments.filter((c: any) => c.skill === 'reading' && c.type === 'strength').map((c: any) => c.text),
      readingNextSteps: comments.filter((c: any) => c.skill === 'reading' && c.type === 'next_step').map((c: any) => c.text),
      speakingStrengths: comments.filter((c: any) => c.skill === 'speaking' && c.type === 'strength').map((c: any) => c.text),
      speakingNextSteps: comments.filter((c: any) => c.skill === 'speaking' && c.type === 'next_step').map((c: any) => c.text),
      teacherNotes: report.teacher_notes || '',
      finalText: report.final_text,
      recommendedLevel: report.recommended_level || undefined,
    };
    const doc = await generateTrialReportPdfWithLogo(pdfData);
    doc.save(`Trial_Report_${studentName.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  const handleShareWhatsApp = () => {
    if (!generatedReport) return;
    const phone = trialInfo?.phone?.replace(/\D/g, '') || '';
    const text = encodeURIComponent(generatedReport.text);
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleMarkSent = async () => {
    if (!loadedReportId) return;
    try {
      await updateReport.mutateAsync({
        reportId: loadedReportId, trialId, selectedComments: mapComments(), studentName,
        teacherNotes: teacherNotes.trim() || undefined, gender: trialInfo?.gender || undefined,
        finalText: generatedReport?.text, status: 'sent',
      });
      setReportStatus('sent');
      toast.success('Report marked as sent!');
    } catch (err: any) {
      toast.error('Failed to update status', { description: err.message });
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedIds(new Set());
    setTeacherNotes('');
    
    setReportStatus('draft');
    setGeneratedReport(null);
    setLoadedReportId(null);
    setLevelFilter('all');
  };

  const hasUnsavedChanges = generatedReport && generatedReport.text !== generatedReport.originalText;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Trial Lesson Report — {studentName}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && (loadedReportId
              ? 'Edit selections and notes, then re-generate to update the report.'
              : 'Select observations, add notes, then generate a professional report for parents.')}
            {step === 'preview' && 'Review, edit, polish with AI, share via WhatsApp, or download as PDF.'}
            {step === 'history' && 'Previous reports for this student.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step navigation */}
        <div className="flex items-center gap-2 text-sm px-6 pb-2">
          <Button variant={step === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('select')}>
            1. Select
          </Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Button variant={step === 'preview' ? 'default' : 'ghost'} size="sm" disabled={!generatedReport} onClick={() => setStep('preview')}>
            2. Preview & PDF
          </Button>
          {existingReports.length > 1 && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button variant={step === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('history')}>
                History ({existingReports.length})
              </Button>
            </>
          )}
        </div>

        <Separator />

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-4">
            {step === 'select' && (
              <ReportSelectStep
                commentBank={commentBank}
                bankLoading={bankLoading}
                selectedIds={selectedIds}
                onToggle={toggleComment}
                teacherNotes={teacherNotes}
                onTeacherNotesChange={setTeacherNotes}
                loadedReportId={loadedReportId}
                canGenerate={canGenerate}
                isGenerating={saveReport.isPending || updateReport.isPending}
                onGenerate={handleGenerate}
                onReset={resetForm}
                selectionCounts={selectionCounts}
              />
            )}

            {step === 'preview' && generatedReport && (
              <ReportPreviewStep
                generatedReport={generatedReport}
                onTextChange={(text) => setGeneratedReport({ ...generatedReport, text })}
                trialInfo={trialInfo}
                
                reportStatus={reportStatus}
                isPolishing={polishReport.isPending}
                isSaving={updateReport.isPending}
                hasUnsavedChanges={!!hasUnsavedChanges}
                copied={copied}
                onPolish={handlePolish}
                onSaveEdits={handleSaveEdits}
                onDownloadPdf={() => handleDownloadPdf()}
                onCopy={handleCopy}
                onReset={resetForm}
                onShareWhatsApp={handleShareWhatsApp}
                onMarkSent={handleMarkSent}
              />
            )}

            {step === 'history' && (
              <ReportHistoryStep
                reports={existingReports}
                onDownloadPdf={handleDownloadHistoryPdf}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
