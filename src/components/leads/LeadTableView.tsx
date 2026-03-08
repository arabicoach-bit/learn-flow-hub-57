import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, UserPlus } from 'lucide-react';
import type { Lead } from '@/hooks/use-leads';

interface LeadTableViewProps {
  leads: Lead[];
  onUpdateLeadStatus: (leadId: string, status: string) => void;
  onUpdateTrialStatus: (leadId: string, trialStatus: string) => void;
  onUpdateFollowUp: (leadId: string, followUp: string) => void;
  onUpdateHandledBy: (leadId: string, handledBy: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onConvertToTrial?: (lead: Lead) => void;
}

const leadStatusColors: Record<string, string> = {
  New: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  Contacted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Interested: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const trialStatusColors: Record<string, string> = {
  'Trial Booked': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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

const leadStatusOptions = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];
const trialStatusOptions = ['Trial Booked', 'Pending', 'Price Negotiation', 'Lost'];
const followUpOptions = [
  'F.1 – Student Motivation', 'F.2 – Free Resources', 'F.3 – Parent Feedback',
  'F.4 – Special Offer', 'F.5 – Help Offer', 'F.6 – Soft Reminder', 'F.7 – Arabic Challenge',
];

export function LeadTableView({ leads, onUpdateLeadStatus, onUpdateTrialStatus, onUpdateFollowUp, onEdit, onDelete, onConvertToTrial }: LeadTableViewProps) {
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
            <TableHead>Follow-Up Date</TableHead>
            <TableHead>Handled By</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.lead_id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
              <TableCell className="text-muted-foreground">{lead.source || '—'}</TableCell>
              <TableCell className="text-muted-foreground">{lead.interest || '—'}</TableCell>

              {/* Lead Status Dropdown */}
              <TableCell>
                <Select
                  value={lead.status || ''}
                  onValueChange={(value) => onUpdateLeadStatus(lead.lead_id, value)}
                >
                  <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0">
                    <Badge className={leadStatusColors[lead.status || ''] || 'bg-muted text-muted-foreground'}>
                      {lead.status || 'Set Status'}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Trial Status Dropdown */}
              <TableCell>
                <Select
                  value={lead.trial_status || '__none__'}
                  onValueChange={(value) => onUpdateTrialStatus(lead.lead_id, value === '__none__' ? '' : value)}
                >
                  <SelectTrigger className="h-8 w-[150px] border-0 bg-transparent p-0">
                    {lead.trial_status ? (
                      <Badge className={trialStatusColors[lead.trial_status] || 'bg-muted text-muted-foreground'}>
                        {lead.trial_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Set Status</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {trialStatusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Follow-Up Dropdown */}
              <TableCell>
                <Select
                  value={lead.follow_up || '__none__'}
                  onValueChange={(value) => onUpdateFollowUp(lead.lead_id, value === '__none__' ? '' : value)}
                >
                  <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent p-0">
                    {lead.follow_up ? (
                      <Badge className={followUpColors[lead.follow_up] || 'bg-muted text-muted-foreground'}>
                        {lead.follow_up}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Set Follow-Up</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {followUpOptions.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Follow-Up Date (auto-set when follow-up changes) */}
              <TableCell>
                {lead.last_contact_date ? (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(lead.last_contact_date), 'MMM d, yyyy')}
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
                    <DropdownMenuItem onClick={() => onDelete(lead.lead_id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Lead
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
