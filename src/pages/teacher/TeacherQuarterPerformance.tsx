import { useMemo } from 'react';
import { TeacherLayout } from '@/components/layout/TeacherLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, BarChart3 } from 'lucide-react';
import {
  getAcademicYear, getAvailableAcademicYears, useQuarterAnalysis,
} from '@/hooks/use-quarter-analysis';
import { getCurrentQuarter } from '@/components/shared/QuarterFilter';
import { QuarterStudentsSection } from '@/components/quarter/QuarterStudentsSection';
import { QuarterPackagesSection } from '@/components/quarter/QuarterPackagesSection';
import { QuarterLessonsSection } from '@/components/quarter/QuarterLessonsSection';
import { QuarterTeachersSection } from '@/components/quarter/QuarterTeachersSection';
import { QuarterCharts } from '@/components/quarter/QuarterCharts';
import { QuarterBonusSection } from '@/components/quarter/QuarterBonusSection';

export default function TeacherQuarterPerformance() {
  const currentQ = getCurrentQuarter();
  const academicYear = useMemo(() => getAcademicYear(currentQ.year), [currentQ.year]);
  const currentQuarter = academicYear.quarters[currentQ.quarterIdx];

  const { data, isLoading } = useQuarterAnalysis(currentQuarter, currentQ.year);

  return (
    <TeacherLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              Quarter Performance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Academic performance review — monthly breakdown with quarter totals</p>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {currentQuarter.label} — {currentQuarter.months.map(m => new Date(2000, m - 1).toLocaleString('en', { month: 'short' })).join(' · ')}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
            {currentQuarter.startDate} → {currentQuarter.endDate}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : data ? (
          <>
            <QuarterCharts monthlyBreakdown={data.monthlyBreakdown} />
            <QuarterStudentsSection
              data={data.students}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={null}
              comparePrevious={false}
            />
            <QuarterPackagesSection
              data={data.packages}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={null}
              comparePrevious={false}
            />
            <QuarterLessonsSection
              data={data.lessons}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={null}
              comparePrevious={false}
            />
            <QuarterTeachersSection data={data.teachers} />
            <QuarterBonusSection bonuses={data.quarterlyBonuses} />
          </>
        ) : null}
      </div>
    </TeacherLayout>
  );
}
