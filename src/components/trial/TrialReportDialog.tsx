import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, Mic, Sparkles, FileText, Copy, Check, Loader2, ChevronRight, Download } from 'lucide-react';
import { useCommentBank, useSaveTrialReport, usePolishReport, useTrialReports, type CommentBankEntry } from '@/hooks/use-trial-reports';
import { generateTrialReportPdfWithLogo, type TrialReportPdfData } from '@/lib/trial-report-pdf';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  };
}

// Extracted as a proper component to avoid re-creation on every render
function CommentCheckList({
  comments,
  selectedIds,
  onToggle,
  maxSelect,
}: {
  comments: CommentBankEntry[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  maxSelect: number;
}) {
  const selectedCount = comments.filter(c => selectedIds.has(c.comment_id)).length;
  return (
    <div className="space-y-1.5">
      {comments.map(c => {
        const isSelected = selectedIds.has(c.comment_id);
        const isDisabled = !isSelected && selectedCount >= maxSelect;
        return (
          <label
            key={c.comment_id}
            className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
              isSelected
                ? 'bg-primary/10 border-primary/40'
                : isDisabled
                ? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                : 'border-border hover:bg-accent/50'
            }`}
          >
            <Checkbox
              checked={isSelected}
              disabled={isDisabled}
              onCheckedChange={() => !isDisabled && onToggle(c.comment_id)}
              className="mt-0.5"
            />
            <span className={isSelected ? 'font-medium' : ''}>{c.comment_text}</span>
          </label>
        );
      })}
    </div>
  );
}

export function TrialReportDialog({ open, onOpenChange, trialId, studentName, trialInfo }: TrialReportDialogProps) {
  const { data: commentBank = [], isLoading: bankLoading } = useCommentBank();
  const { data: existingReports = [] } = useTrialReports(trialId);
  const saveReport = useSaveTrialReport();
  const polishReport = usePolishReport();

  const [step, setStep] = useState<'select' | 'preview' | 'history'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [teacherNotes, setTeacherNotes] = useState('');
  const [generatedReport, setGeneratedReport] = useState<{ reportId: string; text: string; isPolished: boolean; originalText: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredComments = useMemo(() => {
    const filter = (skill: string, type: string) =>
      commentBank.filter(c => c.skill === skill && c.comment_type === type);
    return {
      readingStrengths: filter('reading', 'strength'),
      readingNextSteps: filter('reading', 'next_step'),
      speakingStrengths: filter('speaking', 'strength'),
      speakingNextSteps: filter('speaking', 'next_step'),
    };
  }, [commentBank]);

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

  const handleGenerate = async () => {
    try {
      const mapped = selectedComments.map(c => ({
        commentId: c.comment_id,
        skill: c.skill,
        type: c.comment_type,
        text: c.comment_text,
      }));
      const result = await saveReport.mutateAsync({
        trialId,
        selectedComments: mapped,
        studentName,
        teacherNotes: teacherNotes.trim() || undefined,
        gender: trialInfo?.gender || undefined,
      });
      setGeneratedReport({ reportId: result.report_id, text: result.final_text, isPolished: false, originalText: result.final_text });
      setStep('preview');
      toast.success('Report generated!');
    } catch (err: any) {
      toast.error('Failed to generate report', { description: err.message });
    }
  };

  const handlePolish = async () => {
    if (!generatedReport) return;
    try {
      const polishedText = await polishReport.mutateAsync({
        reportId: generatedReport.reportId,
        trialId,
        templateText: generatedReport.text,
        studentName,
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
    const pdfData = buildPdfData(finalText);
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
    };
    const doc = await generateTrialReportPdfWithLogo(pdfData);
    doc.save(`Trial_Report_${studentName.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF downloaded!');
  };

  const resetForm = () => {
    setStep('select');
    setSelectedIds(new Set());
    setTeacherNotes('');
    setGeneratedReport(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Trial Lesson Report — {studentName}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select observations, add notes, then generate a professional report for parents.'}
            {step === 'preview' && 'Review, edit, polish with AI, then download as PDF.'}
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
          {existingReports.length > 0 && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button variant={step === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('history')}>
                History ({existingReports.length})
              </Button>
            </>
          )}

          {/* Selection counter */}
          {step === 'select' && (
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className={selectionCounts.rStr >= 1 ? 'text-emerald-500' : ''}>R✅ {selectionCounts.rStr}</span>
              <span className={selectionCounts.rNext >= 1 ? 'text-emerald-500' : ''}>R🎯 {selectionCounts.rNext}</span>
              <span className={selectionCounts.sStr >= 1 ? 'text-emerald-500' : ''}>S✅ {selectionCounts.sStr}</span>
              <span className={selectionCounts.sNext >= 1 ? 'text-emerald-500' : ''}>S🎯 {selectionCounts.sNext}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-4">
            {step === 'select' && (
              <div className="space-y-5">
                {bankLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Two-column layout: Reading | Speaking */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Reading */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-sm">Reading</h3>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">✅ Strengths (select 1–5)</p>
                          <CommentCheckList
                            comments={filteredComments.readingStrengths}
                            selectedIds={selectedIds}
                            onToggle={toggleComment}
                            maxSelect={5}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">🎯 Next Steps (select 1–3)</p>
                          <CommentCheckList
                            comments={filteredComments.readingNextSteps}
                            selectedIds={selectedIds}
                            onToggle={toggleComment}
                            maxSelect={3}
                          />
                        </div>
                      </div>

                      {/* Speaking */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold text-sm">Conversation (Speaking & Listening)</h3>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">✅ Strengths (select 1–5)</p>
                          <CommentCheckList
                            comments={filteredComments.speakingStrengths}
                            selectedIds={selectedIds}
                            onToggle={toggleComment}
                            maxSelect={5}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">🎯 Next Steps (select 1–3)</p>
                          <CommentCheckList
                            comments={filteredComments.speakingNextSteps}
                            selectedIds={selectedIds}
                            onToggle={toggleComment}
                            maxSelect={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Teacher Notes */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">📝 Teacher Notes (optional — will appear in the report)</p>
                      <Textarea
                        placeholder="Add any personal observation about the student..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        className="min-h-[70px] resize-none"
                      />
                    </div>

                    {/* Generate button */}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        {canGenerate
                          ? `${selectedIds.size} observations selected — ready to generate`
                          : 'Select at least 1 strength & 1 next step per skill'}
                      </p>
                      <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || saveReport.isPending}
                        size="lg"
                      >
                        {saveReport.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-2" /> Generate Report</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 'preview' && generatedReport && (
              <div className="space-y-4">
                {/* Trial info summary */}
                {trialInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Teacher</span>
                      <p className="font-medium">{trialInfo.teacherName || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Date & Time</span>
                      <p className="font-medium">
                        {trialInfo.trialDate ? format(new Date(trialInfo.trialDate), 'dd MMM yyyy') : 'N/A'} · {formatTime12h(trialInfo.trialTime)}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-muted-foreground text-xs">Program · Duration</span>
                      <p className="font-medium">{trialInfo.program || 'N/A'} · {trialInfo.duration || 30} min</p>
                    </div>
                  </div>
                )}

                <Card>
                  <CardContent className="pt-5 pb-4">
                    <Textarea
                      value={generatedReport.text}
                      onChange={(e) => setGeneratedReport({ ...generatedReport, text: e.target.value })}
                      className="min-h-[200px] text-sm leading-relaxed border-0 shadow-none focus-visible:ring-0 p-0"
                    />
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 flex-wrap">
                  {!generatedReport.isPolished && (
                    <Button onClick={handlePolish} disabled={polishReport.isPending} variant="outline">
                      {polishReport.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Polishing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> Polish with AI</>
                      )}
                    </Button>
                  )}
                  {generatedReport.isPolished && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      <Sparkles className="w-3 h-3 mr-1" /> AI Polished
                    </Badge>
                  )}
                  <Button onClick={() => handleDownloadPdf()}>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button onClick={handleCopy} variant="outline">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    Generate Another
                  </Button>
                </div>
              </div>
            )}

            {step === 'history' && (
              <div className="space-y-3">
                {existingReports.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No reports generated yet.</p>
                )}
                {existingReports.map(r => (
                  <Card key={r.report_id}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
                        </Badge>
                        {r.ai_polished_text && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" /> AI Polished
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed mb-3">{r.final_text}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadHistoryPdf(r)}>
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(r.final_text);
                            toast.success('Copied!');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
