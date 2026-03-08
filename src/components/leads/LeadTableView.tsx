import { format, isPast, isToday } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, AlertTriangle, UserPlus } from 'lucide-react';
import type { Lead } from '@/hooks/use-leads';

interface LeadTableViewProps {
  leads: Lead[];
  onUpdateTrialStatus: (leadId: string, trialStatus: string) => void;
  onUpdateFollowUp: (leadId: string, followUp: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onConvertToTrial?: (lead: Lead) => void;
}

const trialStatusColors: Record<string, string> = {
  'Trial Booked': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Price Negotiation': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const leadStatusColors: Record<string, string> = {
  New: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  Contacted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Interested: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
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

const trialStatusOptions = ['Trial Booked', 'Pending', 'Price Negotiation', 'Lost'];
const followUpOptions = [
  'F.1 – Student Motivation', 'F.2 – Free Resources', 'F.3 – Parent Feedback',
  'F.4 – Special Offer', 'F.5 – Help Offer', 'F.6 – Soft Reminder', 'F.7 – Arabic Challenge',
];

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return isPast(d) && !isToday(d);
}

export function LeadTableView({ leads, onUpdateTrialStatus, onUpdateFollowUp, onEdit, onDelete, onConvertToTrial }: LeadTableViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Interest</TableHead>
            <TableHead>Lead Status</TableHead>
            <TableHead>Trial Status</TableHead>
            <TableHead>Follow-Up</TableHead>
            <TableHead>Next Follow-up</TableHead>
            <TableHead>Handled By</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const overdue = isOverdue(lead.next_followup_date);
            return (
              <TableRow
                key={lead.lead_id}
                className={overdue ? 'bg-destructive/5' : undefined}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                <TableCell className="text-muted-foreground">{lead.source || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{lead.interest || '—'}</TableCell>
                <TableCell>
                  {lead.status && (
                    <Badge className={leadStatusColors[lead.status] || 'bg-muted text-muted-foreground'}>
                      {lead.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {lead.trial_status && (
                    <Badge className={trialStatusColors[lead.trial_status] || 'bg-muted text-muted-foreground'}>
                      {lead.trial_status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {lead.follow_up && (
                    <Badge className={followUpColors[lead.follow_up] || 'bg-muted text-muted-foreground'}>
                      {lead.follow_up}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {lead.next_followup_date ? (
                    <span className={`flex items-center gap-1 text-sm ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                      {format(new Date(lead.next_followup_date), 'MMM d, yyyy')}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.handled_by || '—'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(lead)}>Edit Details</DropdownMenuItem>
                      {onConvertToTrial && lead.trial_status !== 'Trial Booked' && lead.status !== 'Converted' && (
                        <DropdownMenuItem onClick={() => onConvertToTrial(lead)} className="text-primary">
                          <UserPlus className="w-4 h-4 mr-2" />Convert to Trial
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {trialStatusOptions.map(s => (
                        <DropdownMenuItem key={s} onClick={() => onUpdateTrialStatus(lead.lead_id, s)}>
                          Mark as {s}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {followUpOptions.map(o => (
                        <DropdownMenuItem key={o} onClick={() => onUpdateFollowUp(lead.lead_id, o)}>
                          {o}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(lead.lead_id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
