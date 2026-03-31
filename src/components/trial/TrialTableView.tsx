import { useState } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronRight, Pencil, Trash2, UserPlus, Phone, Calendar, GraduationCap, User, School, FileText, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TrialStudent } from '@/hooks/use-trial-students';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];

interface TrialTableViewProps {
  students: TrialStudent[];
  onUpdateStatus: (trialId: string, status: TrialStatus) => void;
  onUpdateConversion: (trialId: string, conversion: 'Pending' | 'Converted' | 'Lost') => void;
  onUpdateResult: (trialId: string, result: TrialResult) => void;
  onUpdateFollowUp: (trialId: string, followUp: string) => void;
  onUpdateHandledBy: (trialId: string, handledBy: string) => void;
  onEdit: (student: TrialStudent) => void;
  onConvert: (student: TrialStudent) => void;
  onDelete: (trialId: string) => void;
}

const statusColors: Record<string, string> = {
  Scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  Absent: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const conversionColors: Record<string, string> = {
  Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const resultColors: Record<string, string> = {
  'Very Positive': 'bg-emerald-500/20 text-emerald-400',
  Positive: 'bg-green-500/20 text-green-400',
  Neutral: 'bg-amber-500/20 text-amber-400',
  Negative: 'bg-red-500/20 text-red-400',
};

const followUpOptions = [
  'F.1 – Student Motivation', 'F.2 – Free Resources', 'F.3 – Parent Feedback',
  'F.4 – Special Offer', 'F.5 – Help Offer', 'F.6 – Soft Reminder', 'F.7 – Arabic Challenge',
];

const followUpColors: Record<string, string> = {
  'F.1 – Student Motivation': 'bg-emerald-500/20 text-emerald-400',
  'F.2 – Free Resources': 'bg-green-500/20 text-green-400',
  'F.3 – Parent Feedback': 'bg-teal-500/20 text-teal-400',
  'F.4 – Special Offer': 'bg-orange-500/20 text-orange-400',
  'F.5 – Help Offer': 'bg-cyan-500/20 text-cyan-400',
  'F.6 – Soft Reminder': 'bg-amber-500/20 text-amber-400',
  'F.7 – Arabic Challenge': 'bg-violet-500/20 text-violet-400',
};

const handledByOptions = ['Amira', 'Hind', 'Mona', 'Ahmed', 'Eman'];

function getRowHighlight(student: TrialStudent) {
  if (student.conversion_status === 'Converted') return 'bg-emerald-500/5 hover:bg-emerald-500/10';
  if (student.conversion_status === 'Lost') return 'bg-red-500/5 hover:bg-red-500/10';
  if (student.status === 'Absent') return 'bg-orange-500/5 hover:bg-orange-500/10';
  if (student.status === 'Completed' && student.conversion_status === 'Pending') return 'bg-amber-500/5 hover:bg-amber-500/10';
  return 'hover:bg-muted/50';
}

export function TrialTableView({ students, onUpdateStatus, onUpdateConversion, onUpdateResult, onUpdateFollowUp, onUpdateHandledBy, onEdit, onConvert, onDelete }: TrialTableViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
                <TableHead>Student</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Trial Date</TableHead>
                {/* Status group */}
                <TableHead className="text-center border-l border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Attendance</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Conversion</span>
                </TableHead>
                <TableHead className="text-center border-r border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Result</span>
                </TableHead>
                {/* CRM group */}
                <TableHead className="text-center border-l border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Follow-Up</span>
                </TableHead>
                <TableHead className="text-center border-r border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Handled By</span>
                </TableHead>
                <TableHead className="w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => {
                const isExpanded = expandedIds.has(student.trial_id);
                const canConvert = student.conversion_status === 'Pending' && student.status !== 'Absent';

                return (
                  <Collapsible key={student.trial_id} open={isExpanded} onOpenChange={() => toggleExpand(student.trial_id)} asChild>
                    <>
                      <TableRow
                        className={`cursor-pointer transition-colors ${getRowHighlight(student)} ${isExpanded ? 'border-b-0' : ''}`}
                        onClick={() => toggleExpand(student.trial_id)}
                      >
                        <TableCell className="px-2 py-2">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs px-1 py-2">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-[120px]">
                            <p className="font-medium text-sm leading-tight">{student.name}</p>
                            {student.parent_guardian_name && (
                              <p className="text-[11px] text-muted-foreground leading-tight">{student.parent_guardian_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-2">{student.teachers?.name || '—'}</TableCell>
                        <TableCell className="py-2">
                          {student.trial_date ? (
                            <div className="min-w-[85px]">
                              <p className="text-sm leading-tight">{format(new Date(student.trial_date), 'MMM d, yyyy')}</p>
                              {student.trial_time && <p className="text-[11px] text-muted-foreground leading-tight">{student.trial_time}</p>}
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>

                        {/* Status group */}
                        <TableCell className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <Select value={student.status} onValueChange={(v) => onUpdateStatus(student.trial_id, v as TrialStatus)}>
                              <SelectTrigger className="h-6 w-[105px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                                <Badge className={`text-[11px] px-1.5 py-0 ${statusColors[student.status] || ''}`}>{student.status}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground/70 pl-0.5">
                              {student.attendance_updated_at ? format(new Date(student.attendance_updated_at), 'dd MMM yyyy') : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                          {student.status === 'Completed' ? (
                            <div className="flex flex-col gap-0.5">
                              <Select value={student.conversion_status} onValueChange={(v) => onUpdateConversion(student.trial_id, v as any)}>
                                <SelectTrigger className="h-6 w-[105px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                                  <Badge className={`text-[11px] px-1.5 py-0 ${conversionColors[student.conversion_status] || ''}`}>{student.conversion_status}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Converted">Converted</SelectItem>
                                  <SelectItem value="Lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-[10px] text-muted-foreground/70 pl-0.5">
                                {student.conversion_updated_at ? format(new Date(student.conversion_updated_at), 'dd MMM yyyy') : '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] pl-0.5">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <Select value={student.trial_result || '_none'} onValueChange={(v) => onUpdateResult(student.trial_id, v as TrialResult)}>
                            <SelectTrigger className="h-6 w-[115px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                              {student.trial_result ? (
                                <Badge className={`text-[11px] px-1.5 py-0 ${resultColors[student.trial_result] || ''}`}>{student.trial_result}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Set result</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Very Positive">Very Positive</SelectItem>
                              <SelectItem value="Positive">Positive</SelectItem>
                              <SelectItem value="Neutral">Neutral</SelectItem>
                              <SelectItem value="Negative">Negative</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* CRM group */}
                        <TableCell className="py-2 border-l border-border/30" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <Select
                              value={student.follow_up || '__none__'}
                              onValueChange={(v) => onUpdateFollowUp(student.trial_id, v === '__none__' ? '' : v)}
                            >
                              <SelectTrigger className="h-6 w-[160px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                                {student.follow_up ? (
                                  <Badge className={`text-[11px] px-1.5 py-0 ${followUpColors[student.follow_up] || 'bg-muted text-muted-foreground'}`}>{student.follow_up}</Badge>
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
                              {student.last_contact_date ? format(new Date(student.last_contact_date), 'dd MMM yyyy') : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 border-r border-border/30" onClick={e => e.stopPropagation()}>
                          <Select
                            value={student.handled_by || '__none__'}
                            onValueChange={(v) => onUpdateHandledBy(student.trial_id, v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-6 w-[100px] text-xs border-0 bg-transparent px-0.5 focus:ring-0">
                              {student.handled_by ? (
                                <span className="text-xs">{student.handled_by}</span>
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

                        <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            {canConvert && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={() => onConvert(student)} title="Convert">
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(student)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(student.trial_id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={11} className="p-0">
                            <CollapsibleContent forceMount className="px-6 py-4">
                              <div className="grid grid-cols-4 gap-6 text-sm">
                                {/* Contact */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>{student.phone}</span>
                                    </div>
                                    {student.parent_guardian_name && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-3.5 h-3.5" />
                                        <span>Parent: {student.parent_guardian_name}</span>
                                      </div>
                                    )}
                                    {student.age && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{student.age} yrs{student.gender ? ` • ${student.gender}` : ''}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Academic */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Academic</h4>
                                  <div className="space-y-1.5">
                                    {student.interested_program && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        <span>{student.interested_program}</span>
                                      </div>
                                    )}
                                    {student.student_level && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        <span>Level: {student.student_level}</span>
                                      </div>
                                    )}
                                    {student.school && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <School className="w-3.5 h-3.5" />
                                        <span>{student.school}</span>
                                      </div>
                                    )}
                                    {student.year_group && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Year: {student.year_group}</span>
                                      </div>
                                    )}
                                    {!student.interested_program && !student.student_level && !student.school && !student.year_group && (
                                      <p className="text-muted-foreground text-xs">No academic info</p>
                                    )}
                                  </div>
                                </div>

                                {/* Trial Info */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trial Details</h4>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{student.duration_minutes} min session</span>
                                    </div>
                                    {student.teacher_payment_amount !== null && (
                                      <div className="text-muted-foreground text-xs">
                                        Teacher: EGP {student.teacher_payment_amount} · Admin: EGP {student.admin_payment_amount}
                                      </div>
                                    )}
                                    {student.last_contact_date && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Last contact: {format(new Date(student.last_contact_date), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                    {student.registration_date && (
                                      <div className="text-muted-foreground text-xs">
                                        Registered: {format(new Date(student.registration_date), 'MMM d, yyyy')}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                                  {student.notes ? (
                                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">{student.notes}</p>
                                  ) : (
                                    <p className="text-muted-foreground text-xs">No notes</p>
                                  )}
                                  {student.follow_up_notes && (
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Follow-up notes:</p>
                                      <p className="text-muted-foreground text-xs leading-relaxed">{student.follow_up_notes}</p>
                                    </div>
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
    </Card>
  );
}
