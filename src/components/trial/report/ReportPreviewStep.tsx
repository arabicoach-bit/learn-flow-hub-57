import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Copy, Check, Loader2, Download, Save, Share2 } from 'lucide-react';
import { format } from 'date-fns';

interface GeneratedReport {
  reportId: string;
  text: string;
  isPolished: boolean;
  originalText: string;
}

interface ReportPreviewStepProps {
  generatedReport: GeneratedReport;
  onTextChange: (text: string) => void;
  trialInfo?: {
    teacherName?: string;
    program?: string;
    trialDate?: string;
    trialTime?: string;
    duration?: number;
  };
  studentPhone?: string;
  
  reportStatus: string;
  isPolishing: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  copied: boolean;
  onPolish: () => void;
  onSaveEdits: () => void;
  onDownloadPdf: () => void;
  onCopy: () => void;
  onReset: () => void;
  onShareWhatsApp: () => void;
  onMarkSent: () => void;
}

function formatTime12h(time: string | undefined) {
  if (!time) return 'N/A';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function ReportPreviewStep({
  generatedReport,
  onTextChange,
  trialInfo,
  
  reportStatus,
  isPolishing,
  isSaving,
  hasUnsavedChanges,
  copied,
  onPolish,
  onSaveEdits,
  onDownloadPdf,
  onCopy,
  onReset,
  onShareWhatsApp,
  onMarkSent,
}: ReportPreviewStepProps) {
  return (
    <div className="space-y-4">
      {/* Trial info summary */}
      {trialInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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

      {/* Status badge */}
      {reportStatus === 'sent' && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
          <Check className="w-4 h-4" />
          <span>Report has been sent to parent</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-5 pb-4">
          <Textarea
            value={generatedReport.text}
            onChange={(e) => onTextChange(e.target.value)}
            className="min-h-[200px] text-sm leading-relaxed border-0 shadow-none focus-visible:ring-0 p-0"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Polish button - always show if not yet polished, or show re-polish after edits */}
        {(!generatedReport.isPolished || hasUnsavedChanges) && (
          <Button onClick={onPolish} disabled={isPolishing} variant="outline">
            {isPolishing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Polishing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> {generatedReport.isPolished ? 'Re-polish with AI' : 'Polish with AI'}</>
            )}
          </Button>
        )}
        {generatedReport.isPolished && !hasUnsavedChanges && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" /> AI Polished
          </Badge>
        )}
        {hasUnsavedChanges && (
          <Button onClick={onSaveEdits} disabled={isSaving} variant="outline" className="border-amber-500/50 text-amber-600">
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Changes</>
            )}
          </Button>
        )}
        <Button onClick={onDownloadPdf}>
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
        <Button onClick={onShareWhatsApp} variant="outline" className="border-emerald-500/50 text-emerald-600">
          <Share2 className="w-4 h-4 mr-2" /> WhatsApp
        </Button>
        <Button onClick={onCopy} variant="outline">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copied!' : 'Copy Text'}
        </Button>
        {reportStatus !== 'sent' && (
          <Button onClick={onMarkSent} variant="ghost" className="text-emerald-600">
            <Check className="w-4 h-4 mr-2" /> Mark as Sent
          </Button>
        )}
        <Button variant="ghost" onClick={onReset}>Start Fresh</Button>
      </div>
    </div>
  );
}
