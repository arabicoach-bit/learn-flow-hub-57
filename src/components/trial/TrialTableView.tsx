import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
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

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    Scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Absent: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

const conversionBadge = (status: string) => {
  const colors: Record<string, string> = {
    Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

const resultBadge = (result: string) => {
  const colors: Record<string, string> = {
    'Very Positive': 'bg-emerald-500/20 text-emerald-400',
    Positive: 'bg-green-500/20 text-green-400',
    Neutral: 'bg-amber-500/20 text-amber-400',
    Negative: 'bg-red-500/20 text-red-400',
  };
  return colors[result] || 'bg-muted text-muted-foreground';
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

export function TrialTableView({ students, onUpdateStatus, onUpdateConversion, onUpdateResult, onUpdateFollowUp, onUpdateHandledBy, onEdit, onConvert, onDelete }: TrialTableViewProps) {
  return (
    <Card className="bg-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Trial Date</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => {
                const canConvert = student.conversion_status === 'Pending' && student.status !== 'Absent';
                return (
                  <TableRow key={student.trial_id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        {student.parent_guardian_name && (
                          <p className="text-xs text-muted-foreground">{student.parent_guardian_name}</p>
                        )}
                        {student.age && (
                          <p className="text-xs text-muted-foreground">
                            {student.age} yrs{student.gender ? ` • ${student.gender}` : ''}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{student.phone}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {student.interested_program && <p>{student.interested_program}</p>}
                        {student.student_level && <p className="text-xs text-muted-foreground">{student.student_level}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{student.teachers?.name || '—'}</TableCell>
                    <TableCell>
                      {student.trial_date ? (
                        <div className="text-sm">
                          <p>{format(new Date(student.trial_date), 'MMM d, yyyy')}</p>
                          {student.trial_time && <p className="text-xs text-muted-foreground">{student.trial_time}</p>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Select value={student.status} onValueChange={(v) => onUpdateStatus(student.trial_id, v as TrialStatus)}>
                        <SelectTrigger className="h-7 w-[120px] text-xs border-0 bg-transparent px-1 focus:ring-0">
                          <Badge className={statusBadge(student.status)}>{student.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={student.conversion_status} onValueChange={(v) => onUpdateConversion(student.trial_id, v as any)}>
                        <SelectTrigger className="h-7 w-[120px] text-xs border-0 bg-transparent px-1 focus:ring-0">
                          <Badge className={conversionBadge(student.conversion_status)}>{student.conversion_status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Converted">Converted</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={student.trial_result || '_none'} onValueChange={(v) => onUpdateResult(student.trial_id, v as TrialResult)}>
                        <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-transparent px-1 focus:ring-0">
                          {student.trial_result ? (
                            <Badge className={resultBadge(student.trial_result)}>{student.trial_result}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Set result</span>
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
                    <TableCell>
                      {student.notes ? (
                        <p className="text-xs text-muted-foreground max-w-[150px] truncate" title={student.notes}>{student.notes}</p>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canConvert && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => onConvert(student)} title="Convert to Student">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(student)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(student.trial_id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
