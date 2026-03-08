import { Users, CheckCircle, UserCheck, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { KPICard, SectionHeader, MonthlyTable, ComparisonRow } from './QuarterShared';
import type { QuarterStudentKPIs, MonthlyStats } from '@/hooks/use-quarter-analysis';

interface Props {
  data: QuarterStudentKPIs;
  monthlyBreakdown: MonthlyStats[];
  prevData?: QuarterStudentKPIs | null;
  comparePrevious: boolean;
}

export function QuarterStudentsSection({ data, monthlyBreakdown, prevData, comparePrevious }: Props) {
  return (
    <>
      <SectionHeader title="Students" emoji="👩‍🎓" theme="students" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Students" value={data.totalStudents} icon={<Users className="w-5 h-5" />} theme="students" />
        <KPICard title="Active" value={data.activeStudents} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="students" />
        <KPICard title="New This Quarter" value={data.newStudents} icon={<UserCheck className="w-5 h-5" />} variant="success" theme="students" />
        <KPICard title="Temporary Stop" value={data.temporaryStop} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" theme="students" />
        <KPICard title="Left" value={data.leftStudents} icon={<XCircle className="w-5 h-5" />} variant="danger" theme="students" />
        <KPICard title="Retention Rate" value={data.retentionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.retentionRate >= 80 ? 'success' : 'warning'} theme="students" />
      </div>
      {comparePrevious && prevData && (
        <ComparisonRow items={[
          { label: 'Total', current: data.totalStudents, previous: prevData.totalStudents },
          { label: 'New', current: data.newStudents, previous: prevData.newStudents },
          { label: 'Retention', current: data.retentionRate, previous: prevData.retentionRate },
        ]} />
      )}
      <MonthlyTable
        theme="students"
        headers={['Month', 'New Students']}
        rows={monthlyBreakdown.map(m => [m.monthLabel, String(m.newStudents)])}
        totalRow={['Quarter Total', String(data.newStudents)]}
      />
    </>
  );
}
