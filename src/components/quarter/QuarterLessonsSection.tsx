import { BookOpen, CheckCircle, XCircle, Calendar, UserCheck, TrendingUp } from 'lucide-react';
import { KPICard, SectionHeader, MonthlyTable, ComparisonRow } from './QuarterShared';
import type { QuarterLessonKPIs, MonthlyStats } from '@/hooks/use-quarter-analysis';

interface Props {
  data: QuarterLessonKPIs;
  monthlyBreakdown: MonthlyStats[];
  prevData?: QuarterLessonKPIs | null;
  comparePrevious: boolean;
}

export function QuarterLessonsSection({ data, monthlyBreakdown, prevData, comparePrevious }: Props) {
  return (
    <>
      <SectionHeader title="Lessons" emoji="📚" theme="lessons" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Lessons" value={data.totalLessons} icon={<BookOpen className="w-5 h-5" />} theme="lessons" />
        <KPICard title="Completed" value={data.completedLessons} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="lessons" />
        <KPICard title="Absent" value={data.absentLessons} icon={<XCircle className="w-5 h-5" />} variant="danger" theme="lessons" />
        <KPICard title="Scheduled" value={data.scheduledLessons} icon={<Calendar className="w-5 h-5" />} theme="lessons" />
        <KPICard title="Trial Lessons" value={data.trialLessons} icon={<UserCheck className="w-5 h-5" />} theme="lessons" />
        <KPICard title="Trial Conversion" value={data.trialConversionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.trialConversionRate >= 50 ? 'success' : 'warning'} theme="lessons" />
      </div>
      {comparePrevious && prevData && (
        <ComparisonRow items={[
          { label: 'Lessons', current: data.totalLessons, previous: prevData.totalLessons },
          { label: 'Completed', current: data.completedLessons, previous: prevData.completedLessons },
          { label: 'Trial Conv.', current: data.trialConversionRate, previous: prevData.trialConversionRate },
        ]} />
      )}
      <MonthlyTable
        theme="lessons"
        headers={['Month', 'Total', 'Completed', 'Absent', 'Scheduled', 'Trials', 'Trial Conv. %']}
        rows={monthlyBreakdown.map(m => [m.monthLabel, String(m.totalLessons), String(m.completedLessons), String(m.absentLessons), String(m.scheduledLessons), String(m.trialLessons), `${m.trialConversionRate}%`])}
        totalRow={['Quarter Total', String(data.totalLessons), String(data.completedLessons), String(data.absentLessons), String(data.scheduledLessons), String(data.trialLessons), `${data.trialConversionRate}%`]}
      />
    </>
  );
}
