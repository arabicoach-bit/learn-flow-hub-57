import { useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Pencil, Trash2, UserPlus, Phone, Calendar, GraduationCap, User, MessageSquareText, Tag, FileText } from 'lucide-react';
import { useLeadCommentsCounts } from '@/hooks/use-lead-comments';
import { LeadCommentsDialog } from '@/components/leads/LeadCommentsDialog';
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
const handledByOptions = ['Amira', 'Hind', 'Mona', 'Ahmed', 'Eman'];

function getRowHighlight(lead: Lead) {
  if (lead.status === 'Converted' || lead.trial_status === 'Trial Booked') return 'bg-emerald-500/5 hover:bg-emerald-500/10';
  if (lead.status === 'Lost' || lead.trial_status === 'Lost') return 'bg-red-500/5 hover:bg-red-500/10';
  if (lead.trial_status === 'Price Negotiation') return 'bg-purple-500/5 hover:bg-purple-500/10';
  if (lead.status === 'Interested') return 'bg-amber-500/5 hover:bg-amber-500/10';
  return 'hover:bg-muted/50';
}

export function LeadTableView({ leads, onUpdateLeadStatus, onUpdateTrialStatus, onUpdateFollowUp, onUpdateHandledBy, onEdit, onDelete, onConvertToTrial }: LeadTableViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [commentsLeadId, setCommentsLeadId] = useState<string | null>(null);
  const [commentsLeadName, setCommentsLeadName] = useState('');

  const leadIds = leads.map(l => l.lead_id);
  const { data: commentCounts } = useLeadCommentsCounts(leadIds);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[28px] px-2"></TableHead>
                <TableHead className="w-[32px] px-1">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                {/* Status group */}
                <TableHead className="text-center border-l border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Lead Status</span>
                </TableHead>
                <TableHead className="text-center border-r border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Trial Status</span>
                </TableHead>
                {/* CRM group */}
                <TableHead className="text-center border-l border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Follow-Up</span>
                </TableHead>
                <TableHead className="text-center border-r border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Handled By</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Notes</span>
                </TableHead>
                <TableHead className="w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead, index) => {
                const isExpanded = expandedIds.has(lead.lead_id);
                const canConvert = lead.trial_status !== 'Trial Booked' && lead.status !== 'Converted';

                return (
                  <Collapsible key={lead.lead_id} open={isExpanded} onOpenChange={() => toggleExpand(lead.lead_id)} asChild>
                    <>
                      <TableRow
                        className={`cursor-pointer transition-colors ${getRowHighlight(lead)} ${isExpanded ? 'border-b-0' : ''}`}
                        onClick={() => toggleExpand(lead.lead_id)}
                      >
                        <TableCell className="px-2 py-2">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs px-1 py-2">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[120px]">
                            <p className="font-medium text-sm leading-tight">{lead.name}</p>
                            {lead.source && (
                              <p className="text-[11px] text-muted-foreground leading-tight">{lead.source}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-2">{lead.phone}</TableCell>

                        {/* Lead Status */}
                        <TableCell className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                          <Select value={lead.status || ''} onValueChange={(v) => onUpdateLeadStatus(lead.lead_id, v)}>
                            <SelectTrigger className="h-6 w-[105px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                              <Badge className={`text-[11px] px-1.5 py-0 ${leadStatusColors[lead.status || ''] || 'bg-muted text-muted-foreground'}`}>
                                {lead.status || 'Set'}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {leadStatusOptions.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Trial Status */}
                        <TableCell className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <Select
                            value={lead.trial_status || '__none__'}
                            onValueChange={(v) => onUpdateTrialStatus(lead.lead_id, v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-6 w-[120px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                              {lead.trial_status ? (
                                <Badge className={`text-[11px] px-1.5 py-0 ${trialStatusColors[lead.trial_status] || 'bg-muted text-muted-foreground'}`}>
                                  {lead.trial_status}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Set Status</span>
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

                        {/* Follow-Up */}
                        <TableCell className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <Select
                              value={lead.follow_up || '__none__'}
                              onValueChange={(v) => onUpdateFollowUp(lead.lead_id, v === '__none__' ? '' : v)}
                            >
                              <SelectTrigger className="h-6 w-[160px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                                {lead.follow_up ? (
                                  <Badge className={`text-[11px] px-1.5 py-0 ${followUpColors[lead.follow_up] || 'bg-muted text-muted-foreground'}`}>
                                    {lead.follow_up}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">Set Follow-Up</span>
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— None —</SelectItem>
                                {followUpOptions.map(o => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground/70 pl-0.5">
                              {lead.last_contact_date ? format(new Date(lead.last_contact_date), 'dd MMM yyyy') : '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Handled By */}
                        <TableCell className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <Select
                            value={lead.handled_by || '__none__'}
                            onValueChange={(v) => onUpdateHandledBy(lead.lead_id, v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-6 w-[100px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                              {lead.handled_by ? (
                                <span className="text-xs">{lead.handled_by}</span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Assign</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {handledByOptions.map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Notes */}
                        <TableCell className="text-center py-2" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 relative"
                            onClick={() => { setCommentsLeadId(lead.lead_id); setCommentsLeadName(lead.name); }}
                            title="Notes"
                          >
                            <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                            {(commentCounts?.[lead.lead_id] ?? 0) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center font-medium">
                                {commentCounts![lead.lead_id]}
                              </span>
                            )}
                          </Button>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            {onConvertToTrial && canConvert && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => onConvertToTrial(lead)} title="Convert to Trial">
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(lead)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(lead.lead_id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded details */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={10} className="p-0">
                            <CollapsibleContent forceMount className="px-6 py-4">
                              <div className="grid grid-cols-4 gap-6 text-sm">
                                {/* Contact Info */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>{lead.phone}</span>
                                    </div>
                                    {lead.source && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Tag className="w-3.5 h-3.5" />
                                        <span>Source: {lead.source}</span>
                                      </div>
                                    )}
                                    {lead.handled_by && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-3.5 h-3.5" />
                                        <span>Handled by: {lead.handled_by}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Interest */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interest</h4>
                                  <div className="space-y-1.5">
                                    {lead.interest ? (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        <span>{lead.interest}</span>
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground text-xs">No interest specified</p>
                                    )}
                                  </div>
                                </div>

                                {/* Dates */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dates</h4>
                                  <div className="space-y-1.5">
                                    {lead.first_contact_date && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>First: {format(new Date(lead.first_contact_date), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                    {lead.last_contact_date && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Last: {format(new Date(lead.last_contact_date), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                    {lead.next_followup_date && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Next F/U: {format(new Date(lead.next_followup_date), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                    {!lead.first_contact_date && !lead.last_contact_date && !lead.next_followup_date && (
                                      <p className="text-muted-foreground text-xs">No dates recorded</p>
                                    )}
                                  </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                                  {lead.notes ? (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                      <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground text-xs">No notes</p>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </td>
                        </tr>
                      )}
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {commentsLeadId && (
        <LeadCommentsDialog
          open={!!commentsLeadId}
          onOpenChange={(open) => { if (!open) setCommentsLeadId(null); }}
          leadId={commentsLeadId}
          leadName={commentsLeadName}
        />
      )}
    </Card>
  );
}
