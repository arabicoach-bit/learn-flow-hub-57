import { format, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical, Phone, GraduationCap, Calendar, User,
  MessageSquare, Tag, Trash2, AlertTriangle, UserPlus,
} from 'lucide-react';
import type { Lead } from '@/hooks/use-leads';

interface LeadCardProps {
  lead: Lead;
  commentCount?: number;
  onUpdateLeadStatus: (leadId: string, status: string) => void;
  onUpdateFollowUp: (leadId: string, followUp: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
  onConvertToTrial?: (lead: Lead) => void;
  onOpenNotes?: (lead: Lead) => void;
}

const statusColors: Record<string, string> = {
  'Trial Booked': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Price Negotiation': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const followUpColors: Record<string, string> = {
  'F.1 – Student Motivation': 'bg-emerald-500/20 text-emerald-400',
  'F.2 – Free Resources': 'bg-green-500/20 text-green-400',
  'F.3 – Parent Feedback': 'bg-teal-500/20 text-teal-400',
  'F.4 – Special Offer': 'bg-orange-500/20 text-orange-400',
  'F.5 – Help Offer': 'bg-cyan-500/20 text-cyan-400',
  'F.6 – Soft Reminder': 'bg-amber-500/20 text-amber-400',
  'F.7 – Arabic Challenge': 'bg-violet-500/20 text-violet-400',
};

const statusOptions = ['Pending', 'Trial Booked', 'Price Negotiation', 'Lost'];
const followUpOptions = [
  'F.1 – Student Motivation', 'F.2 – Free Resources', 'F.3 – Parent Feedback',
  'F.4 – Special Offer', 'F.5 – Help Offer', 'F.6 – Soft Reminder', 'F.7 – Arabic Challenge',
];

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return isPast(d) && !isToday(d);
}

export function LeadCard({ lead, commentCount, onUpdateLeadStatus, onUpdateFollowUp, onEdit, onDelete, onConvertToTrial, onOpenNotes }: LeadCardProps) {
  const overdue = isOverdue(lead.next_followup_date);

  return (
    <Card className={`bg-card border-border hover:border-primary/30 transition-colors ${overdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{lead.name}</CardTitle>
            {lead.source && (
              <p className="text-sm text-muted-foreground">Source: {lead.source}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[lead.trial_status] || 'bg-muted text-muted-foreground'}>
              {lead.trial_status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(lead)}>Edit Details</DropdownMenuItem>
                {onConvertToTrial && lead.trial_status !== 'Trial Booked' && (
                  <DropdownMenuItem onClick={() => onConvertToTrial(lead)} className="text-primary">
                    <UserPlus className="w-4 h-4 mr-2" />Convert to Trial
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {statusOptions.map((status) => (
                  <DropdownMenuItem key={status} onClick={() => onUpdateLeadStatus(lead.lead_id, status)}>
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {followUpOptions.map((option) => (
                  <DropdownMenuItem key={option} onClick={() => onUpdateFollowUp(lead.lead_id, option)}>
                    <Tag className="w-4 h-4 mr-2" />{option}
                  </DropdownMenuItem>
                ))}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(lead.lead_id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />Delete Lead
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" /><span>{lead.phone}</span>
          </div>
          {lead.handled_by && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" /><span>{lead.handled_by}</span>
            </div>
          )}
        </div>

        {lead.interest && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4" /><span>{lead.interest}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm flex-wrap">
          {lead.first_contact_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>First: {format(new Date(lead.first_contact_date), 'MMM d, yyyy')}</span>
            </div>
          )}
          {lead.next_followup_date && (
            <div className={`flex items-center gap-1 ml-2 ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              {overdue ? <AlertTriangle className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
              <span>Follow-up: {format(new Date(lead.next_followup_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {lead.follow_up && (
          <Badge className={followUpColors[lead.follow_up] || 'bg-muted text-muted-foreground'}>
            {lead.follow_up}
          </Badge>
        )}

        <div className="flex items-center justify-between border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-muted-foreground hover:text-foreground px-2"
            onClick={() => onOpenNotes?.(lead)}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Notes</span>
            {(commentCount || 0) > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-xs ml-1">
                {commentCount}
              </Badge>
            )}
          </Button>
        </div>

        {lead.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground border-t pt-2">
            <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" /><p>{lead.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
