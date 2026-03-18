import { Trophy, CheckCircle2, XCircle, Clock, Users, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { sectionColors } from './QuarterShared';
import type { TeacherQuarterlyBonus } from '@/hooks/use-quarter-analysis';
import { useState } from 'react';

interface Props {
  bonuses: TeacherQuarterlyBonus[];
}

const ruleIcons: Record<string, React.ReactNode> = {
  'Teaching Hours': <Clock className="w-4 h-4" />,
  'Retention Rate': <Users className="w-4 h-4" />,
  'Trial Lesson Success': <GraduationCap className="w-4 h-4" />,
};

export function QuarterBonusSection({ bonuses }: Props) {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const colors = sectionColors.teachers;
  const totalQuarterlyBonus = bonuses.reduce((s, b) => s + b.totalBonus, 0);
  const totalEligible = bonuses.filter(b => b.totalBonus > 0).length;

  return (
    <>
      <div className={`flex items-center gap-2 pt-6 pb-1 border-b border-amber-500/20`}>
        <span className="text-xl">🏆</span>
        <h2 className="text-xl font-display font-bold text-amber-500">Quarterly Bonuses</h2>
        <Badge variant="outline" className="ml-2 text-xs">750 EGP per rule</Badge>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`glass-card ${colors.card}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{totalEligible}/{bonuses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Teachers Eligible</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${colors.card}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">EGP {totalQuarterlyBonus.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Quarterly Bonus</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${colors.card}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">
              {bonuses.reduce((s, b) => s + b.rules.filter(r => r.achieved).length, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Rules Achieved</p>
          </CardContent>
        </Card>
        <Card className={`glass-card ${colors.card}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold">
              {bonuses.reduce((s, b) => s + b.rules.filter(r => !r.achieved).length, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Rules Not Met</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-teacher bonus table */}
      <Card className={`glass-card border-l-4 border-l-amber-500/40`}>
        <CardHeader className="bg-amber-500/10">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            🏆 Teacher Quarterly Bonus Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-500/10">
                  <TableHead className="font-semibold">Teacher</TableHead>
                  <TableHead className="text-center">Teaching Hours</TableHead>
                  <TableHead className="text-center">Retention</TableHead>
                  <TableHead className="text-center">Trial Success</TableHead>
                  <TableHead className="text-right">Total Bonus</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonuses.map((b) => {
                  const isExpanded = expandedTeacher === b.teacherId;
                  return (
                    <>
                      <TableRow
                        key={b.teacherId}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setExpandedTeacher(isExpanded ? null : b.teacherId)}
                      >
                        <TableCell className="font-medium">{b.teacherName}</TableCell>
                        {b.rules.map((rule, ri) => (
                          <TableCell key={ri} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <StatusBadge achieved={rule.achieved} />
                              <span className="text-xs text-muted-foreground">
                                {rule.actual}{rule.suffix.startsWith('%') || rule.suffix.startsWith('hrs') ? rule.suffix : ` ${rule.suffix}`}
                              </span>
                            </div>
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold">
                          {b.totalBonus > 0 ? (
                            <span className="text-emerald-600">EGP {b.totalBonus.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${b.teacherId}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/20 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {b.rules.map((rule, ri) => (
                                <BonusRuleCard key={ri} rule={rule} monthlyHours={ri === 0 ? b.monthlyHours : undefined} />
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                <TableRow className="font-bold bg-amber-500/5">
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right text-emerald-600">
                    EGP {totalQuarterlyBonus.toLocaleString()}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function StatusBadge({ achieved }: { achieved: boolean }) {
  return achieved ? (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
      <CheckCircle2 className="w-3 h-3 mr-1" /> Achieved
    </Badge>
  ) : (
    <Badge variant="outline" className="text-red-500 border-red-500/30">
      <XCircle className="w-3 h-3 mr-1" /> Not Met
    </Badge>
  );
}

function BonusRuleCard({ rule, monthlyHours }: {
  rule: TeacherQuarterlyBonus['rules'][0];
  monthlyHours?: TeacherQuarterlyBonus['monthlyHours'];
}) {
  return (
    <div className={`rounded-lg border p-3 ${rule.achieved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        {ruleIcons[rule.name]}
        <span className="font-semibold text-sm">{rule.name}</span>
        <StatusBadge achieved={rule.achieved} />
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">Actual</span>
        <span className="font-medium">{rule.actual}{rule.suffix.startsWith('%') || rule.suffix.startsWith('hrs') ? ` ${rule.suffix}` : ` ${rule.suffix}`}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">Target</span>
        <span className="font-medium">≥ {rule.target}{rule.suffix.includes('%') ? '%' : rule.suffix.includes('hrs') ? ' hrs/mo' : ''}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Bonus</span>
        <span className={`font-bold ${rule.achieved ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {rule.achieved ? `EGP ${rule.amount}` : '—'}
        </span>
      </div>
      {monthlyHours && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Monthly breakdown (target: 60 hrs each):</p>
          {monthlyHours.map((m, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span>{m.month}</span>
              <span className={m.met ? 'text-emerald-600' : 'text-red-500'}>
                {m.hours} hrs {m.met ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
