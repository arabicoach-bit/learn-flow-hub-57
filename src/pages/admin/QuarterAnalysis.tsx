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
  Users, Package, BookOpen, UserCheck, TrendingUp, TrendingDown,
  DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, BarChart3
} from 'lucide-react';
import {
  getAcademicYear,
  getAvailableAcademicYears,
  useQuarterAnalysis,
  type AcademicQuarter,
} from '@/hooks/use-quarter-analysis';

type SectionTheme = 'students' | 'packages' | 'lessons' | 'teachers';

const sectionColors: Record<SectionTheme, { icon: string; card: string; border: string; headerBg: string; totalBg: string }> = {
  students: { icon: 'text-blue-500', card: 'border-l-4 border-l-blue-500/40', border: 'border-blue-500/20', headerBg: 'bg-blue-500/10', totalBg: 'bg-blue-500/5' },
  packages: { icon: 'text-emerald-500', card: 'border-l-4 border-l-emerald-500/40', border: 'border-emerald-500/20', headerBg: 'bg-emerald-500/10', totalBg: 'bg-emerald-500/5' },
  lessons: { icon: 'text-violet-500', card: 'border-l-4 border-l-violet-500/40', border: 'border-violet-500/20', headerBg: 'bg-violet-500/10', totalBg: 'bg-violet-500/5' },
  teachers: { icon: 'text-amber-500', card: 'border-l-4 border-l-amber-500/40', border: 'border-amber-500/20', headerBg: 'bg-amber-500/10', totalBg: 'bg-amber-500/5' },
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

function RateBadge({ value, good = 70 }: { value: number; good?: number }) {
  const color = value >= good ? 'text-emerald-600 bg-emerald-500/10' : value >= 40 ? 'text-amber-600 bg-amber-500/10' : 'text-red-600 bg-red-500/10';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}%</span>;
}

function ComparisonBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isUp = diff >= 0;
  return (
    <Badge variant="outline" className={`text-xs ${isUp ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}>
      {isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
      {Math.abs(Math.round(diff))}%
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

  const previousQuarter = useMemo((): AcademicQuarter | null => {
    if (!comparePrevious) return null;
    if (selectedQuarterIdx > 0) return academicYear.quarters[selectedQuarterIdx - 1];
    const prevYear = getAcademicYear(selectedYear - 1);
    return prevYear.quarters[2];
  }, [comparePrevious, selectedQuarterIdx, selectedYear, academicYear]);

  const { data, isLoading } = useQuarterAnalysis(currentQuarter, selectedYear);
  const { data: prevData } = useQuarterAnalysis(previousQuarter, selectedQuarterIdx > 0 ? selectedYear : selectedYear - 1);

  const mb = data?.monthlyBreakdown || [];

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
            {/* ========== SECTION 1: STUDENTS ========== */}
            <SectionHeader title="Students" emoji="👩‍🎓" theme="students" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="Total Students" value={data.students.totalStudents} icon={<Users className="w-5 h-5" />} theme="students" />
              <KPICard title="Active" value={data.students.activeStudents} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="students" />
              <KPICard title="New This Quarter" value={data.students.newStudents} icon={<UserCheck className="w-5 h-5" />} variant="success" theme="students" />
              <KPICard title="Temporary Stop" value={data.students.temporaryStop} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" theme="students" />
              <KPICard title="Left" value={data.students.leftStudents} icon={<XCircle className="w-5 h-5" />} variant="danger" theme="students" />
              <KPICard title="Retention Rate" value={data.students.retentionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.students.retentionRate >= 80 ? 'success' : 'warning'} theme="students" />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow items={[
                { label: 'Total', current: data.students.totalStudents, previous: prevData.students.totalStudents },
                { label: 'New', current: data.students.newStudents, previous: prevData.students.newStudents },
                { label: 'Retention', current: data.students.retentionRate, previous: prevData.students.retentionRate },
              ]} />
            )}

            {/* Monthly Students Table */}
            <MonthlyTable
              theme="students"
              headers={['Month', 'New Students']}
              rows={mb.map(m => [m.monthLabel, String(m.newStudents)])}
              totalRow={['Quarter Total', String(data.students.newStudents)]}
            />

            {/* ========== SECTION 2: PACKAGES ========== */}
            <SectionHeader title="Packages" emoji="📦" theme="packages" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <KPICard title="Total Packages" value={data.packages.totalPackages} icon={<Package className="w-5 h-5" />} theme="packages" />
              <KPICard title="New" value={data.packages.newPackages} icon={<Package className="w-5 h-5" />} variant="success" theme="packages" />
              <KPICard title="Renewals" value={data.packages.renewals} icon={<TrendingUp className="w-5 h-5" />} theme="packages" />
              <KPICard title="Running" value={data.packages.runningPackages} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="packages" />
              <KPICard title="Completed" value={data.packages.completedPackages} icon={<CheckCircle className="w-5 h-5" />} theme="packages" />
              <KPICard title="Pending" value={data.packages.pendingPayments} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" theme="packages" />
              <KPICard title="Paid Revenue" value={`AED ${data.packages.paidRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} variant="success" theme="packages" />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow items={[
                { label: 'Total', current: data.packages.totalPackages, previous: prevData.packages.totalPackages },
                { label: 'Revenue', current: data.packages.paidRevenue, previous: prevData.packages.paidRevenue },
                { label: 'Renewals', current: data.packages.renewals, previous: prevData.packages.renewals },
              ]} />
            )}

            {/* Monthly Packages Table */}
            <MonthlyTable
              theme="packages"
              headers={['Month', 'Total', 'New', 'Renewals', 'Paid Revenue (AED)', 'Pending']}
              rows={mb.map(m => [m.monthLabel, String(m.totalPackages), String(m.newPackages), String(m.renewals), m.paidRevenue.toLocaleString(), String(m.pendingPayments)])}
              totalRow={['Quarter Total', String(data.packages.totalPackages), String(data.packages.newPackages), String(data.packages.renewals), data.packages.paidRevenue.toLocaleString(), String(data.packages.pendingPayments)]}
            />

            {/* ========== SECTION 3: LESSONS ========== */}
            <SectionHeader title="Lessons" emoji="📚" theme="lessons" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard title="Total Lessons" value={data.lessons.totalLessons} icon={<BookOpen className="w-5 h-5" />} theme="lessons" />
              <KPICard title="Completed" value={data.lessons.completedLessons} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="lessons" />
              <KPICard title="Absent" value={data.lessons.absentLessons} icon={<XCircle className="w-5 h-5" />} variant="danger" theme="lessons" />
              <KPICard title="Scheduled" value={data.lessons.scheduledLessons} icon={<Calendar className="w-5 h-5" />} theme="lessons" />
              <KPICard title="Trial Lessons" value={data.lessons.trialLessons} icon={<UserCheck className="w-5 h-5" />} theme="lessons" />
              <KPICard title="Trial Conversion" value={data.lessons.trialConversionRate} icon={<TrendingUp className="w-5 h-5" />} suffix="%" variant={data.lessons.trialConversionRate >= 50 ? 'success' : 'warning'} theme="lessons" />
            </div>
            {comparePrevious && prevData && (
              <ComparisonRow items={[
                { label: 'Lessons', current: data.lessons.totalLessons, previous: prevData.lessons.totalLessons },
                { label: 'Completed', current: data.lessons.completedLessons, previous: prevData.lessons.completedLessons },
                { label: 'Trial Conv.', current: data.lessons.trialConversionRate, previous: prevData.lessons.trialConversionRate },
              ]} />
            )}

            {/* Monthly Lessons Table */}
            <MonthlyTable
              theme="lessons"
              headers={['Month', 'Total', 'Completed', 'Absent', 'Scheduled', 'Trials', 'Trial Conv. %']}
              rows={mb.map(m => [m.monthLabel, String(m.totalLessons), String(m.completedLessons), String(m.absentLessons), String(m.scheduledLessons), String(m.trialLessons), `${m.trialConversionRate}%`])}
              totalRow={['Quarter Total', String(data.lessons.totalLessons), String(data.lessons.completedLessons), String(data.lessons.absentLessons), String(data.lessons.scheduledLessons), String(data.lessons.trialLessons), `${data.lessons.trialConversionRate}%`]}
            />

            {/* ========== SECTION 4: TEACHERS ========== */}
            <SectionHeader title="Teachers" emoji="👨‍🏫" theme="teachers" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title="Active Teachers" value={data.teachers.totalActiveTeachers} icon={<Users className="w-5 h-5" />} theme="teachers" />
              <KPICard title="Lessons Taught" value={data.teachers.lessonsTaughtThisQuarter} icon={<BookOpen className="w-5 h-5" />} theme="teachers" />
              <KPICard title="Total Hours" value={data.teachers.totalTeachingHours} icon={<Clock className="w-5 h-5" />} suffix="hrs" theme="teachers" />
              <KPICard title="Total Salary + Bonus" value={`AED ${data.teachers.totalSalary.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} theme="teachers" />
            </div>

            {/* Teacher Performance Table — Quarter Summary */}
            <Card className={`glass-card ${sectionColors.teachers.card}`}>
              <CardHeader className={sectionColors.teachers.headerBg}>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  👨‍🏫 Teacher Quarter Summary
                  <Badge variant="outline" className="text-xs ml-2">Retention & Conversion</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={sectionColors.teachers.headerBg}>
                        <TableHead className="font-semibold">Teacher</TableHead>
                        <TableHead className="text-right">Rate/hr</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Salary</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                        <TableHead className="text-right">Left</TableHead>
                        <TableHead className="text-center">Retention %</TableHead>
                        <TableHead className="text-right">Trials</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-center">Conv. %</TableHead>
                        <TableHead className="text-right">Bonus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.teachers.teacherDetails.map((t) => (
                        <TableRow key={t.teacherId} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{t.ratePerHour}</TableCell>
                          <TableCell className="text-right font-medium">{t.totalHours.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{t.salary.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{t.activeStudents}</TableCell>
                          <TableCell className="text-right">{t.leftStudents}</TableCell>
                          <TableCell className="text-center"><RateBadge value={t.retentionRate} good={80} /></TableCell>
                          <TableCell className="text-right">{t.trialsConducted}</TableCell>
                          <TableCell className="text-right">{t.trialConversions}</TableCell>
                          <TableCell className="text-center"><RateBadge value={t.trialConversionRate} good={60} /></TableCell>
                          <TableCell className="text-right">{t.bonus > 0 ? t.bonus.toLocaleString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className={`font-bold ${sectionColors.teachers.totalBg}`}>
                        <TableCell>Quarter Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{data.teachers.totalTeachingHours.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{data.teachers.totalSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{data.teachers.teacherDetails.reduce((s, t) => s + t.activeStudents, 0)}</TableCell>
                        <TableCell className="text-right">{data.teachers.teacherDetails.reduce((s, t) => s + t.leftStudents, 0)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{data.teachers.teacherDetails.reduce((s, t) => s + t.trialsConducted, 0)}</TableCell>
                        <TableCell className="text-right">{data.teachers.teacherDetails.reduce((s, t) => s + t.trialConversions, 0)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{data.teachers.teacherDetails.reduce((s, t) => s + t.bonus, 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Monthly Breakdown */}
            <Card className={`glass-card ${sectionColors.teachers.card}`}>
              <CardHeader>
                <CardTitle className="font-display text-lg">📅 Teacher Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={sectionColors.teachers.headerBg}>
                        <TableHead className="font-semibold">Teacher</TableHead>
                        <TableHead className="font-semibold">Month</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Salary</TableHead>
                        <TableHead className="text-right">Trials</TableHead>
                        <TableHead className="text-right">Conversions</TableHead>
                        <TableHead className="text-center">Conv. %</TableHead>
                        <TableHead className="text-right">Bonus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.teachers.teacherDetails.map((t) => (
                        <>
                          {t.monthlyData.map((m, mi) => (
                            <TableRow key={`${t.teacherId}-${mi}`} className="hover:bg-muted/30">
                              {mi === 0 && (
                                <TableCell rowSpan={t.monthlyData.length + 1} className="font-medium align-top border-r border-border/30">
                                  {t.name}
                                </TableCell>
                              )}
                              <TableCell>{m.monthLabel}</TableCell>
                              <TableCell className="text-right">{m.hours.toFixed(1)}</TableCell>
                              <TableCell className="text-right">{m.salary.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{m.trialsConducted}</TableCell>
                              <TableCell className="text-right">{m.trialConversions}</TableCell>
                              <TableCell className="text-center">
                                {m.trialsConducted > 0 ? <RateBadge value={m.trialConversionRate} good={60} /> : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-right">{m.bonus > 0 ? m.bonus.toLocaleString() : '-'}</TableCell>
                            </TableRow>
                          ))}
                          {/* Teacher quarter total */}
                          <TableRow className={`font-semibold ${sectionColors.teachers.totalBg}`}>
                            <TableCell>Quarter Total</TableCell>
                            <TableCell className="text-right">{t.totalHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{t.salary.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{t.trialsConducted}</TableCell>
                            <TableCell className="text-right">{t.trialConversions}</TableCell>
                            <TableCell className="text-center">
                              {t.trialsConducted > 0 ? <RateBadge value={t.trialConversionRate} good={60} /> : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right">{t.bonus > 0 ? t.bonus.toLocaleString() : '-'}</TableCell>
                          </TableRow>
                        </>
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

// ===== Shared Components =====

function SectionHeader({ title, emoji, theme }: { title: string; emoji: string; theme: SectionTheme }) {
  const colors = sectionColors[theme];
  return (
    <div className={`flex items-center gap-2 pt-6 pb-1 border-b ${colors.border}`}>
      <span className="text-xl">{emoji}</span>
      <h2 className={`text-xl font-display font-bold ${colors.icon}`}>{title}</h2>
    </div>
  );
}

function MonthlyTable({ theme, headers, rows, totalRow }: {
  theme: SectionTheme;
  headers: string[];
  rows: string[][];
  totalRow: string[];
}) {
  const colors = sectionColors[theme];
  return (
    <Card className={`glass-card ${colors.card}`}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={colors.headerBg}>
                {headers.map((h, i) => (
                  <TableHead key={i} className={`font-semibold ${i > 0 ? 'text-right' : ''}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, ri) => (
                <TableRow key={ri} className="hover:bg-muted/30">
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className={ci > 0 ? 'text-right' : 'font-medium'}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
              {/* Quarter Total Row */}
              <TableRow className={`font-bold ${colors.totalBg}`}>
                {totalRow.map((cell, ci) => (
                  <TableCell key={ci} className={ci > 0 ? 'text-right' : ''}>{cell}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
