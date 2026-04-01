import { Users, BookOpen, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard, SectionHeader, RateBadge, sectionColors } from './QuarterShared';
import type { QuarterTeacherKPIs } from '@/hooks/use-quarter-analysis';

interface Props {
  data: QuarterTeacherKPIs;
}

export function QuarterTeachersSection({ data }: Props) {
  const colors = sectionColors.teachers;

  return (
    <>
      <SectionHeader title="Teachers" emoji="👨‍🏫" theme="teachers" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Active Teachers" value={data.totalActiveTeachers} icon={<Users className="w-5 h-5" />} theme="teachers" />
        <KPICard title="Lessons Taught" value={data.lessonsTaughtThisQuarter} icon={<BookOpen className="w-5 h-5" />} theme="teachers" />
        <KPICard title="Total Hours" value={data.totalTeachingHours} icon={<Clock className="w-5 h-5" />} suffix="hrs" theme="teachers" />
        <KPICard title="Total Salary + Bonus" value={`AED ${data.totalSalary.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} theme="teachers" />
      </div>

      {/* Quarter Summary Table */}
      <Card className={`glass-card ${colors.card}`}>
        <CardHeader className={colors.headerBg}>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            👨‍🏫 Teacher Quarter Summary
            <Badge variant="outline" className="text-xs ml-2">Retention & Conversion</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={colors.headerBg}>
                  <TableHead className="font-semibold">Teacher</TableHead>
                  <TableHead className="text-right">Rate/hr</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Stopped</TableHead>
                  <TableHead className="text-right">Left</TableHead>
                  <TableHead className="text-center">Retention %</TableHead>
                  <TableHead className="text-right">Trials</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-center">Conv. %</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teacherDetails.map((t) => (
                  <TableRow key={t.teacherId} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{t.ratePerHour}</TableCell>
                    <TableCell className="text-right font-medium">{t.totalHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{t.salary.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{t.totalStudents}</TableCell>
                    <TableCell className="text-right">{t.activeStudents}</TableCell>
                    <TableCell className="text-right">{t.stoppedStudents}</TableCell>
                    <TableCell className="text-right">{t.leftStudents}</TableCell>
                    <TableCell className="text-center"><RateBadge value={t.retentionRate} good={80} /></TableCell>
                    <TableCell className="text-right">{t.trialsConducted}</TableCell>
                    <TableCell className="text-right">{t.trialConversions}</TableCell>
                    <TableCell className="text-center"><RateBadge value={t.trialConversionRate} good={60} /></TableCell>
                    <TableCell className="text-right">{t.bonus > 0 ? t.bonus.toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className={`font-bold ${colors.totalBg}`}>
                  <TableCell>Quarter Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{data.totalTeachingHours.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{data.totalSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">{data.teacherDetails.reduce((s, t) => s + t.totalStudents, 0)}</TableCell>
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.activeStudents, 0)}</TableCell>
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.stoppedStudents, 0)}</TableCell>
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.leftStudents, 0)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.trialsConducted, 0)}</TableCell>
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.trialConversions, 0)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{data.teacherDetails.reduce((s, t) => s + t.bonus, 0).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card className={`glass-card ${colors.card}`}>
        <CardHeader>
          <CardTitle className="font-display text-lg">📅 Teacher Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={colors.headerBg}>
                  <TableHead className="font-semibold">Teacher</TableHead>
                  <TableHead className="font-semibold">Month</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Stopped</TableHead>
                  <TableHead className="text-right">Left</TableHead>
                  <TableHead className="text-center">Retention %</TableHead>
                  <TableHead className="text-right">Trials</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-center">Conv. %</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teacherDetails.map((t) => (
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
                        <TableCell className="text-right font-medium">{m.totalStudents}</TableCell>
                        <TableCell className="text-right">{m.activeStudents}</TableCell>
                        <TableCell className="text-right">{m.stoppedStudents}</TableCell>
                        <TableCell className="text-right">{m.leftStudents}</TableCell>
                        <TableCell className="text-center">
                          {(m.activeStudents + m.stoppedStudents + m.leftStudents) > 0 ? <RateBadge value={m.retentionRate} good={80} /> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">{m.trialsConducted}</TableCell>
                        <TableCell className="text-right">{m.trialConversions}</TableCell>
                        <TableCell className="text-center">
                          {m.trialsConducted > 0 ? <RateBadge value={m.trialConversionRate} good={60} /> : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">{m.bonus > 0 ? m.bonus.toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className={`font-semibold ${colors.totalBg}`}>
                      <TableCell>Quarter Total</TableCell>
                      <TableCell className="text-right">{t.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{t.salary.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{t.totalStudents}</TableCell>
                      <TableCell className="text-right">{t.activeStudents}</TableCell>
                      <TableCell className="text-right">{t.stoppedStudents}</TableCell>
                      <TableCell className="text-right">{t.leftStudents}</TableCell>
                      <TableCell className="text-center"><RateBadge value={t.retentionRate} good={80} /></TableCell>
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
  );
}
