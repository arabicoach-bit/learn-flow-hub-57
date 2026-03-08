import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users, GraduationCap, Package, BookOpen, UserCheck, TrendingUp, TrendingDown,
  DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, BarChart3
} from 'lucide-react';
import {
  getAcademicYear,
  getAvailableAcademicYears,
  useQuarterAnalysis,
  type AcademicQuarter,
  type QuarterAnalysisData,
} from '@/hooks/use-quarter-analysis';

type SectionTheme = 'students' | 'packages' | 'lessons' | 'teachers';

const sectionColors: Record<SectionTheme, { icon: string; card: string; border: string }> = {
  students: { icon: 'text-blue-500', card: 'border-l-4 border-l-blue-500/40', border: 'border-blue-500/20' },
  packages: { icon: 'text-emerald-500', card: 'border-l-4 border-l-emerald-500/40', border: 'border-emerald-500/20' },
  lessons: { icon: 'text-violet-500', card: 'border-l-4 border-l-violet-500/40', border: 'border-violet-500/20' },
  teachers: { icon: 'text-amber-500', card: 'border-l-4 border-l-amber-500/40', border: 'border-amber-500/20' },
};

function KPICard({ title, value, icon, suffix, variant, theme }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  theme?: SectionTheme;
}) {
  const variantColors = {
    default: 'text-primary',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };
  const color = variantColors[variant || 'default'];
  const themeStyles = theme ? sectionColors[theme] : null;

  return (
    <Card className={`glass-card hover:shadow-md transition-shadow ${themeStyles?.card || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={color}>{icon}</span>
        </div>
        <p className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonBadge({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0 && current === 0) return null;
  const diff = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isUp = diff >= 0;
  return (
    <Badge variant="outline" className={`text-xs ${isUp ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}>
      {isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
      {Math.abs(Math.round(diff))}%{suffix}
    </Badge>
  );
}

export default function QuarterAnalysis() {
  const academicYears = getAvailableAcademicYears();
  const [selectedYear, setSelectedYear] = useState(academicYears[0].value);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState(0);
  const [comparePrevious, setComparePrevious] = useState(false);

  const academicYear = useMemo(() => getAcademicYear(selectedYear), [selectedYear]);
  const currentQuarter = academicYear.quarters[selectedQuarterIdx];

  // Previous quarter for comparison
  const previousQuarter = useMemo((): AcademicQuarter | null => {
    if (!comparePrevious) return null;
    if (selectedQuarterIdx > 0) {
      return academicYear.quarters[selectedQuarterIdx - 1];
    }
    // Go to previous year Q3
    const prevYear = getAcademicYear(selectedYear - 1);
    return prevYear.quarters[2];
  }, [comparePrevious, selectedQuarterIdx, selectedYear, academicYear]);

  const { data, isLoading } = useQuarterAnalysis(currentQuarter);
  const { data: prevData } = useQuarterAnalysis(previousQuarter);

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
            <p className="text-muted-foreground mt-1">
              Academic performance review by custom quarter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setSelectedQuarterIdx(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(selectedQuarterIdx)} onValueChange={(v) => setSelectedQuarterIdx(Number(v))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {academicYear.quarters.map((q, i) => (
                  <SelectItem key={i} value={String(i)}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quarter info badge */}
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : data ? (
          <>
            {/* STUDENT KPIs */}
            <SectionHeader title="Student KPIs" icon={<GraduationCap className="w-5 h-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="Total Students" value={data.students.totalStudents} icon={<Users className="w-5 h-5" />} />
              <KPICard title="Active Students" value={data.students.activeStudents} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
              <KPICard title="Temporary Stop" value={data.students.temporaryStop} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" />
              <KPICard title="Left Students" value={data.students.leftStudents} icon={<XCircle className="w-5 h-5" />} variant="danger" />
              <KPICard title="New Students" value={data.students.newStudents} icon={<UserCheck className="w-5 h-5" />} variant="success" />
              <KPICard title="Retention Rate" value={data.students.retentionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.students.retentionRate >= 80 ? 'success' : 'warning'} />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow
                items={[
                  { label: 'Students', current: data.students.totalStudents, previous: prevData.students.totalStudents },
                  { label: 'Active', current: data.students.activeStudents, previous: prevData.students.activeStudents },
                  { label: 'New', current: data.students.newStudents, previous: prevData.students.newStudents },
                  { label: 'Retention', current: data.students.retentionRate, previous: prevData.students.retentionRate },
                ]}
              />
            )}

            {/* PACKAGE KPIs */}
            <SectionHeader title="Package KPIs" icon={<Package className="w-5 h-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <KPICard title="Total Packages" value={data.packages.totalPackages} icon={<Package className="w-5 h-5" />} />
              <KPICard title="New Packages" value={data.packages.newPackages} icon={<Package className="w-5 h-5" />} variant="success" />
              <KPICard title="Renewals" value={data.packages.renewals} icon={<TrendingUp className="w-5 h-5" />} />
              <KPICard title="Running" value={data.packages.runningPackages} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
              <KPICard title="Completed" value={data.packages.completedPackages} icon={<CheckCircle className="w-5 h-5" />} />
              <KPICard title="Pending Payments" value={data.packages.pendingPayments} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" />
              <KPICard title="Paid Revenue" value={`AED ${data.packages.paidRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} variant="success" />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow
                items={[
                  { label: 'Total Pkgs', current: data.packages.totalPackages, previous: prevData.packages.totalPackages },
                  { label: 'Revenue', current: data.packages.paidRevenue, previous: prevData.packages.paidRevenue },
                  { label: 'Renewals', current: data.packages.renewals, previous: prevData.packages.renewals },
                ]}
              />
            )}

            {/* LESSON KPIs */}
            <SectionHeader title="Lesson KPIs" icon={<BookOpen className="w-5 h-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="Total Lessons" value={data.lessons.totalLessons} icon={<BookOpen className="w-5 h-5" />} />
              <KPICard title="Completed" value={data.lessons.completedLessons} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
              <KPICard title="Absent" value={data.lessons.absentLessons} icon={<XCircle className="w-5 h-5" />} variant="danger" />
              <KPICard title="Scheduled" value={data.lessons.scheduledLessons} icon={<Calendar className="w-5 h-5" />} />
              <KPICard title="Trial Lessons" value={data.lessons.trialLessons} icon={<UserCheck className="w-5 h-5" />} />
              <KPICard title="Trial Conversion" value={data.lessons.trialConversionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.lessons.trialConversionRate >= 50 ? 'success' : 'warning'} />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow
                items={[
                  { label: 'Lessons', current: data.lessons.totalLessons, previous: prevData.lessons.totalLessons },
                  { label: 'Completed', current: data.lessons.completedLessons, previous: prevData.lessons.completedLessons },
                  { label: 'Trials', current: data.lessons.trialLessons, previous: prevData.lessons.trialLessons },
                  { label: 'Conversion', current: data.lessons.trialConversionRate, previous: prevData.lessons.trialConversionRate },
                ]}
              />
            )}

            {/* TEACHER KPIs */}
            <SectionHeader title="Teacher KPIs" icon={<Users className="w-5 h-5" />} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Active Teachers" value={data.teachers.totalActiveTeachers} icon={<Users className="w-5 h-5" />} />
              <KPICard title="Lessons Taught" value={data.teachers.lessonsTaughtThisQuarter} icon={<BookOpen className="w-5 h-5" />} />
              <KPICard title="Total Hours" value={data.teachers.totalTeachingHours} icon={<Clock className="w-5 h-5" />} suffix="hrs" />
              <KPICard title="Total Salary + Bonus" value={`AED ${data.teachers.totalSalary.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
            </div>

            {/* Teacher performance table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Teacher Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teacher</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Salary (AED)</TableHead>
                        <TableHead className="text-right">Active Students</TableHead>
                        <TableHead className="text-right">Trials</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-right">Bonus (AED)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.teachers.teacherDetails.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-right">{t.hours.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{t.salary.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{t.activeStudents}</TableCell>
                          <TableCell className="text-right">{t.trialsConducted}</TableCell>
                          <TableCell className="text-right">{t.trialConversions}</TableCell>
                          <TableCell className="text-right">{t.bonus > 0 ? t.bonus.toLocaleString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-4">
      <span className="text-primary">{icon}</span>
      <h2 className="text-xl font-display font-bold">{title}</h2>
    </div>
  );
}

function ComparisonRow({ items }: { items: { label: string; current: number; previous: number }[] }) {
  return (
    <div className="flex flex-wrap gap-3 pl-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{item.label}:</span>
          <ComparisonBadge current={item.current} previous={item.previous} />
        </div>
      ))}
    </div>
  );
}
