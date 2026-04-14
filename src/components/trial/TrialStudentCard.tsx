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
  Clock, 
  User, 
  Phone, 
  GraduationCap, 
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Trash2
} from 'lucide-react';
import type { TrialStudent } from '@/hooks/use-trial-students';

interface TrialStudentCardProps {
  student: TrialStudent;
  onUpdateStatus: (trialId: string, status: 'Scheduled' | 'Completed' | 'Absent') => void;
  onUpdateConversion: (trialId: string, conversion: 'Pending' | 'Converted' | 'Lost') => void;
  onUpdateResult: (trialId: string, result: 'Positive' | 'Very Positive' | 'Neutral' | 'Negative') => void;
  onEdit: (student: TrialStudent) => void;
  onConvert?: (student: TrialStudent) => void;
  onDelete?: (trialId: string) => void;
}

const statusColors = {
  Scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  Absent: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const conversionColors = {
  Pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const resultColors = {
  'Very Positive': 'bg-emerald-500/20 text-emerald-400',
  Positive: 'bg-green-500/20 text-green-400',
  Neutral: 'bg-amber-500/20 text-amber-400',
  Negative: 'bg-red-500/20 text-red-400',
};

export function TrialStudentCard({ student, onUpdateStatus, onUpdateConversion, onUpdateResult, onEdit, onConvert, onDelete }: TrialStudentCardProps) {
  const canConvert = student.conversion_status === 'Pending' && student.status !== 'Absent';
  
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{student.name}</CardTitle>
            {student.parent_guardian_name && (
              <p className="text-sm text-muted-foreground">
                Parent: {student.parent_guardian_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[student.status as keyof typeof statusColors] || statusColors.Scheduled}>
              {student.status}
            </Badge>
            <Badge className={conversionColors[student.conversion_status]}>
              {student.conversion_status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(student)}>
                  Edit Details
                </DropdownMenuItem>
                {canConvert && onConvert && (
                  <DropdownMenuItem onClick={() => onConvert(student)} className="text-primary">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convert to Student
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Attendance</div>
                <DropdownMenuItem onClick={() => onUpdateStatus(student.trial_id, 'Scheduled')}>
                  Mark as Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(student.trial_id, 'Completed')}>
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(student.trial_id, 'Absent')}>
                  Mark as Absent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Conversion</div>
                <DropdownMenuItem onClick={() => onUpdateConversion(student.trial_id, 'Pending')}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateConversion(student.trial_id, 'Converted')}>
                  Converted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateConversion(student.trial_id, 'Lost')}>
                  Lost
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Trial Result</div>
                <DropdownMenuItem onClick={() => onUpdateResult(student.trial_id, 'Very Positive')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Very Positive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateResult(student.trial_id, 'Positive')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                  Positive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateResult(student.trial_id, 'Neutral')}>
                  <AlertCircle className="w-4 h-4 mr-2 text-amber-400" />
                  Neutral
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateResult(student.trial_id, 'Negative')}>
                  <XCircle className="w-4 h-4 mr-2 text-red-400" />
                  Negative
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(student.trial_id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Trial Student
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
            <Phone className="w-4 h-4" />
            <span>{student.phone}</span>
          </div>
          {student.age && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{student.age} years old</span>
            </div>
          )}
        </div>

        {(student.interested_program || student.student_level) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4" />
            <span>
              {[student.interested_program, student.student_level].filter(Boolean).join(' • ')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{student.duration_minutes} minutes</span>
          {student.trial_date && (
            <>
              <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
              <span className="text-muted-foreground">
                {format(new Date(student.trial_date), 'MMM d, yyyy')}
                {student.trial_time && ` at ${student.trial_time}`}
              </span>
            </>
          )}
        </div>

        {student.teachers && (
          <div className="p-2 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assigned to:</span>
              <span className="font-medium">{student.teachers.name}</span>
            </div>
            {student.teacher_payment_amount !== null && student.admin_payment_amount !== null && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-green-400" />
                  <span>Teacher: EGP {student.teacher_payment_amount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-blue-400" />
                  <span>Admin: EGP {student.admin_payment_amount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {student.trial_result && (
          <Badge className={resultColors[student.trial_result]}>
            {student.trial_result} Result
          </Badge>
        )}

        {student.notes && (
          <p className="text-sm text-muted-foreground border-t pt-2">
            {student.notes}
          </p>
        )}


        {/* Convert to Student Button - Prominent CTA */}
        {canConvert && onConvert && (
          <Button 
            onClick={() => onConvert(student)} 
            className="w-full mt-2"
            variant="default"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convert to Regular Student
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
