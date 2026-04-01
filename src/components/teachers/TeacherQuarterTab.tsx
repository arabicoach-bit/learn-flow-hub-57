import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Users, BookOpen, TrendingUp } from 'lucide-react';
import { RateBadge } from '@/components/quarter/QuarterShared';
import {
  getAcademicYear, getAvailableAcademicYears, useQuarterAnalysis,
  type AcademicQuarter,
} from '@/hooks/use-quarter-analysis';

interface TeacherQuarterTabProps {
  teacherId: string;
}

function useTeacherQuarterData(quarter: AcademicQuarter | null, year: number, teacherId: string) {
  const { data, isLoading } = useQuarterAnalysis(quarter, year);
  const teacherData = useMemo(() => {
    if (!data || !teacherId) return null;
    return data.teachers.teacherDetails.find(t => t.teacherId === teacherId) || null;
  }, [data, teacherId]);
  return { teacherData, isLoading };
}

export function TeacherQuarterTab({ teacherId }: TeacherQuarterTabProps) {
  const academicYears = getAvailableAcademicYears();
  const [selectedYear, setSelectedYear] = useState(academicYears[0].value);

  const academicYear = useMemo(() => getAcademicYear(selectedYear), [selectedYear]);

  const q1 = academicYear.quarters[0];
  const q2 = academicYear.quarters[1];
  const q3 = academicYear.quarters[2];

  const { teacherData: td1, isLoading: l1 } = useTeacherQuarterData(q1, selectedYear, teacherId);
  const { teacherData: td2, isLoading: l2 } = useTeacherQuarterData(q2, selectedYear, teacherId);
  const { teacherData: td3, isLoading: l3 } = useTeacherQuarterData(q3, selectedYear, teacherId);

  const isLoading = l1 || l2 || l3;

  // Aggregate yearly totals
  const yearlyTotals = useMemo(() => {
    const all = [td1, td2, td3].filter(Boolean) as NonNullable<typeof td1>[];
    if (all.length === 0) return null;
    const latestStudentSnapshot =
      [td3, td2, td1].find((entry) => entry && entry.totalStudents > 0) ??
      [td3, td2, td1].find(Boolean) ??
      null;
    return {
      totalHours: all.reduce((s, t) => s + t.totalHours, 0),
      totalStudents: latestStudentSnapshot?.totalStudents ?? 0,
      activeStudents: latestStudentSnapshot?.activeStudents ?? 0,
      stoppedStudents: latestStudentSnapshot?.stoppedStudents ?? 0,
      leftStudents: latestStudentSnapshot?.leftStudents ?? 0,
      trialsConducted: all.reduce((s, t) => s + t.trialsConducted, 0),
      trialConversions: all.reduce((s, t) => s + t.trialConversions, 0),
    };
  }, [td1, td2, td3]);

  const quarterSections = [
    { quarter: q1, data: td1 },
    { quarter: q2, data: td2 },
    { quarter: q3, data: td3 },
  ];

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="flex items-center gap-3">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.value} value={String(y.value)}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards - Yearly Summary */}
          {yearlyTotals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-l-4 border-l-emerald-500/40">
                <CardContent className="p-4">
                  <Clock className="w-4 h-4 text-emerald-500 mb-1" />
                  <p className="text-2xl font-bold">{yearlyTotals.totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span></p>
                  <p className="text-xs text-muted-foreground">Year Total Hours</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500/40">
                <CardContent className="p-4">
                  <Users className="w-4 h-4 text-blue-500 mb-1" />
                  <p className="text-2xl font-bold">{yearlyTotals.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="text-[10px] text-muted-foreground/60">{yearlyTotals.activeStudents} active · {yearlyTotals.stoppedStudents} stopped · {yearlyTotals.leftStudents} left</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500/40">
                <CardContent className="p-4">
                  <TrendingUp className="w-4 h-4 text-amber-500 mb-1" />
                  <p className="text-2xl font-bold">
                    <RateBadge value={
                      (yearlyTotals.activeStudents + yearlyTotals.stoppedStudents + yearlyTotals.leftStudents) > 0
                        ? Math.round((yearlyTotals.activeStudents / (yearlyTotals.activeStudents + yearlyTotals.stoppedStudents + yearlyTotals.leftStudents)) * 100)
                        : 0
                    } good={80} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Retention Rate</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-violet-500/40">
                <CardContent className="p-4">
                  <BookOpen className="w-4 h-4 text-violet-500 mb-1" />
                  <p className="text-2xl font-bold">{yearlyTotals.trialsConducted}</p>
                  <p className="text-xs text-muted-foreground">Trials ({yearlyTotals.trialConversions} converted)</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {yearlyTotals.trialsConducted > 0 ? `${Math.round((yearlyTotals.trialConversions / yearlyTotals.trialsConducted) * 100)}% conversion` : '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Year Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                📅 Full Year Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-500/10">
                      <TableHead className="font-semibold">Month</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Stopped</TableHead>
                      <TableHead className="text-right">Left</TableHead>
                      <TableHead className="text-center">Retention %</TableHead>
                      <TableHead className="text-right">Trials</TableHead>
                      <TableHead className="text-right">Converted</TableHead>
                      <TableHead className="text-center">Conv. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quarterSections.map(({ quarter, data: td }) => {
                      if (!td) {
                        return (
                          <TableRow key={quarter.label} className="bg-muted/20">
                            <TableCell colSpan={10} className="text-center text-muted-foreground py-3 font-medium">
                              {quarter.label} — No data
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return (
                        <>
                          {td.monthlyData.map((m, i) => (
                            <TableRow key={`${quarter.label}-${i}`} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{m.monthLabel}</TableCell>
                              <TableCell className="text-right">{m.hours.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-medium">{m.totalStudents}</TableCell>
                              <TableCell className="text-right">{m.activeStudents}</TableCell>
                              <TableCell className="text-right">{m.stoppedStudents}</TableCell>
                              <TableCell className="text-right">{m.leftStudents}</TableCell>
                              <TableCell className="text-center">
                                {(m.activeStudents + m.stoppedStudents + m.leftStudents) > 0
                                  ? <RateBadge value={m.retentionRate} good={80} />
                                  : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="text-right">{m.trialsConducted}</TableCell>
                              <TableCell className="text-right">{m.trialConversions}</TableCell>
                              <TableCell className="text-center">
                                {m.trialsConducted > 0
                                  ? <RateBadge value={m.trialConversionRate} good={60} />
                                  : <span className="text-muted-foreground">-</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow key={`${quarter.label}-total`} className="font-bold bg-blue-500/5 border-b-2 border-border">
                            <TableCell>{quarter.label} Total</TableCell>
                            <TableCell className="text-right">{td.totalHours.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-medium">{td.totalStudents}</TableCell>
                            <TableCell className="text-right">{td.activeStudents}</TableCell>
                            <TableCell className="text-right">{td.stoppedStudents}</TableCell>
                            <TableCell className="text-right">{td.leftStudents}</TableCell>
                            <TableCell className="text-center"><RateBadge value={td.retentionRate} good={80} /></TableCell>
                            <TableCell className="text-right">{td.trialsConducted}</TableCell>
                            <TableCell className="text-right">{td.trialConversions}</TableCell>
                            <TableCell className="text-center">
                              {td.trialsConducted > 0
                                ? <RateBadge value={td.trialConversionRate} good={60} />
                                : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
