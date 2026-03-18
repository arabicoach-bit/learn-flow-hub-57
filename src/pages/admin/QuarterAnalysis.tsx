import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, BarChart3 } from 'lucide-react';
import {
  getAcademicYear, getAvailableAcademicYears, useQuarterAnalysis,
  type AcademicQuarter,
} from '@/hooks/use-quarter-analysis';
import { QuarterStudentsSection } from '@/components/quarter/QuarterStudentsSection';
import { QuarterPackagesSection } from '@/components/quarter/QuarterPackagesSection';
import { QuarterLessonsSection } from '@/components/quarter/QuarterLessonsSection';
import { QuarterTeachersSection } from '@/components/quarter/QuarterTeachersSection';
import { QuarterCharts } from '@/components/quarter/QuarterCharts';
import { QuarterBonusSection } from '@/components/quarter/QuarterBonusSection';

export default function QuarterAnalysis() {
  const academicYears = getAvailableAcademicYears();
  const [selectedYear, setSelectedYear] = useState(academicYears[0].value);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState(0);
  const [comparePrevious, setComparePrevious] = useState(false);

  const academicYear = useMemo(() => getAcademicYear(selectedYear), [selectedYear]);
  const currentQuarter = academicYear.quarters[selectedQuarterIdx];

  const previousQuarter = useMemo((): AcademicQuarter | null => {
    if (!comparePrevious) return null;
    if (selectedQuarterIdx > 0) return academicYear.quarters[selectedQuarterIdx - 1];
    const prevYear = getAcademicYear(selectedYear - 1);
    return prevYear.quarters[2];
  }, [comparePrevious, selectedQuarterIdx, selectedYear, academicYear]);

  const { data, isLoading } = useQuarterAnalysis(currentQuarter, selectedYear);
  const { data: prevData } = useQuarterAnalysis(previousQuarter, selectedQuarterIdx > 0 ? selectedYear : selectedYear - 1);

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Quarter Analysis
            </h1>
            <p className="text-muted-foreground mt-1">Academic performance review — monthly breakdown with quarter totals</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setSelectedQuarterIdx(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedQuarterIdx)} onValueChange={(v) => setSelectedQuarterIdx(Number(v))}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {academicYear.quarters.map((q, i) => (
                  <SelectItem key={i} value={String(i)}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {currentQuarter.months.map(m => new Date(2000, m - 1).toLocaleString('en', { month: 'short' })).join(' · ')}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
            {currentQuarter.startDate} → {currentQuarter.endDate}
          </Badge>
          <div className="flex items-center gap-2 ml-auto">
            <Switch id="compare" checked={comparePrevious} onCheckedChange={setComparePrevious} />
            <Label htmlFor="compare" className="text-sm cursor-pointer">Compare with previous quarter</Label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : data ? (
          <>
            {/* Charts Overview */}
            <QuarterCharts monthlyBreakdown={data.monthlyBreakdown} />

            <QuarterStudentsSection
              data={data.students}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={comparePrevious ? prevData?.students : null}
              comparePrevious={comparePrevious}
            />
            <QuarterPackagesSection
              data={data.packages}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={comparePrevious ? prevData?.packages : null}
              comparePrevious={comparePrevious}
            />
            <QuarterLessonsSection
              data={data.lessons}
              monthlyBreakdown={data.monthlyBreakdown}
              prevData={comparePrevious ? prevData?.lessons : null}
              comparePrevious={comparePrevious}
            />
            <QuarterTeachersSection data={data.teachers} />
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
