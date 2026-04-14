import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, UserCheck, GraduationCap, BookOpen } from 'lucide-react';

interface JourneyTimelineProps {
  leadId: string;
}

interface JourneyStep {
  type: 'lead' | 'trial' | 'student';
  label: string;
  name: string;
  status: string;
  date: string | null;
  id: string;
}

const stepConfig = {
  lead: { icon: BookOpen, color: 'bg-amber-500', label: 'Lead' },
  trial: { icon: GraduationCap, color: 'bg-blue-500', label: 'Trial' },
  student: { icon: UserCheck, color: 'bg-emerald-500', label: 'Student' },
};

export function JourneyTimeline({ leadId }: JourneyTimelineProps) {
  const { data: journey, isLoading } = useQuery({
    queryKey: ['lead-journey', leadId],
    queryFn: async () => {
      const steps: JourneyStep[] = [];

      // Get lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (!lead) return steps;

      steps.push({
        type: 'lead',
        label: 'Lead Created',
        name: lead.name,
        status: lead.trial_status,
        date: lead.created_at,
        id: lead.lead_id,
      });

      // Check for linked trial
      const { data: trials } = await supabase
        .from('trial_students')
        .select('trial_id, name, status, conversion_status, created_at, converted_student_id')
        .eq('lead_id', leadId);

      if (trials && trials.length > 0) {
        const trial = trials[0];
        steps.push({
          type: 'trial',
          label: 'Trial Booked',
          name: trial.name,
          status: `${trial.status} / ${trial.conversion_status}`,
          date: trial.created_at,
          id: trial.trial_id,
        });

        // Check for converted student
        if (trial.converted_student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('student_id, name, status, created_at')
            .eq('student_id', trial.converted_student_id)
            .single();

          if (student) {
            steps.push({
              type: 'student',
              label: 'Enrolled',
              name: student.name,
              status: student.status || 'Active',
              date: student.created_at,
              id: student.student_id,
            });
          }
        }
      }

      return steps;
    },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading journey...</div>;
  }

  if (!journey || journey.length <= 1) {
    return <p className="text-muted-foreground text-xs">No conversion journey yet</p>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {journey.map((step, i) => {
        const config = stepConfig[step.type];
        const Icon = config.icon;
        return (
          <div key={step.id} className="flex items-center gap-1">
            {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/50 mx-0.5" />}
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
              <div className={`w-5 h-5 rounded-full ${config.color} flex items-center justify-center`}>
                <Icon className="w-3 h-3 text-white" />
              </div>
              <div className="text-[11px]">
                <span className="font-medium">{config.label}</span>
                {step.date && (
                  <span className="text-muted-foreground ml-1">
                    {format(new Date(step.date), 'MMM d')}
                  </span>
                )}
              </div>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {step.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
