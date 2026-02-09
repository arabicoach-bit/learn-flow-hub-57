import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Phone,
  GraduationCap,
  Calendar,
  User,
  MessageSquare,
  Tag,
} from 'lucide-react';
import type { Lead } from '@/hooks/use-leads';

interface LeadCardProps {
  lead: Lead;
  onUpdateTrialStatus: (leadId: string, trialStatus: string) => void;
  onUpdateFollowUp: (leadId: string, followUp: string) => void;
  onEdit: (lead: Lead) => void;
}

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

const trialStatusOptions = [
  'Trial Booked',
  'Pending',
  'Price Negotiation',
  'Lost',
];

const followUpOptions = [
  'F.1 – Student Motivation',
  'F.2 – Free Resources',
  'F.3 – Parent Feedback',
  'F.4 – Special Offer',
  'F.5 – Help Offer',
  'F.6 – Soft Reminder',
  'F.7 – Arabic Challenge',
];

export function LeadCard({ lead, onUpdateTrialStatus, onUpdateFollowUp, onEdit }: LeadCardProps) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{lead.name}</CardTitle>
            {lead.source && (
              <p className="text-sm text-muted-foreground">
                Source: {lead.source}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lead.trial_status && (
              <Badge className={trialStatusColors[lead.trial_status] || 'bg-muted text-muted-foreground'}>
                {lead.trial_status}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(lead)}>
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {trialStatusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onUpdateTrialStatus(lead.lead_id, status)}
                  >
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {followUpOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => onUpdateFollowUp(lead.lead_id, option)}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <span>{lead.phone}</span>
          </div>
          {lead.handled_by && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{lead.handled_by}</span>
            </div>
          )}
        </div>

        {lead.interest && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span>{lead.interest}</span>
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
            <div className="flex items-center gap-1 text-muted-foreground ml-2">
              <Calendar className="w-4 h-4" />
              <span>Follow-up: {format(new Date(lead.next_followup_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {lead.follow_up && (
          <Badge className={followUpColors[lead.follow_up] || 'bg-muted text-muted-foreground'}>
            {lead.follow_up}
          </Badge>
        )}

        {lead.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground border-t pt-2">
            <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{lead.notes}</p>
          </div>
        )}

        {lead.status && (
          <div className="text-xs text-muted-foreground">
            Lead Status: {lead.status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
