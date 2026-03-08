import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

export type SectionTheme = 'students' | 'packages' | 'lessons' | 'teachers';

export const sectionColors: Record<SectionTheme, { icon: string; card: string; border: string; headerBg: string; totalBg: string }> = {
  students: { icon: 'text-blue-500', card: 'border-l-4 border-l-blue-500/40', border: 'border-blue-500/20', headerBg: 'bg-blue-500/10', totalBg: 'bg-blue-500/5' },
  packages: { icon: 'text-emerald-500', card: 'border-l-4 border-l-emerald-500/40', border: 'border-emerald-500/20', headerBg: 'bg-emerald-500/10', totalBg: 'bg-emerald-500/5' },
  lessons: { icon: 'text-violet-500', card: 'border-l-4 border-l-violet-500/40', border: 'border-violet-500/20', headerBg: 'bg-violet-500/10', totalBg: 'bg-violet-500/5' },
  teachers: { icon: 'text-amber-500', card: 'border-l-4 border-l-amber-500/40', border: 'border-amber-500/20', headerBg: 'bg-amber-500/10', totalBg: 'bg-amber-500/5' },
};

export function KPICard({ title, value, icon, suffix, variant, theme }: {
  title: string;
  value: number | string;
  icon: ReactNode;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  theme?: SectionTheme;
}) {
  const variantColors = { default: 'text-primary', success: 'text-emerald-500', warning: 'text-amber-500', danger: 'text-red-500' };
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

export function RateBadge({ value, good = 70 }: { value: number; good?: number }) {
  const color = value >= good ? 'text-emerald-600 bg-emerald-500/10' : value >= 40 ? 'text-amber-600 bg-amber-500/10' : 'text-red-600 bg-red-500/10';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}%</span>;
}

export function ComparisonBadge({ current, previous }: { current: number; previous: number }) {
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

export function ComparisonRow({ items }: { items: { label: string; current: number; previous: number }[] }) {
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

export function SectionHeader({ title, emoji, theme }: { title: string; emoji: string; theme: SectionTheme }) {
  const colors = sectionColors[theme];
  return (
    <div className={`flex items-center gap-2 pt-6 pb-1 border-b ${colors.border}`}>
      <span className="text-xl">{emoji}</span>
      <h2 className={`text-xl font-display font-bold ${colors.icon}`}>{title}</h2>
    </div>
  );
}

export function MonthlyTable({ theme, headers, rows, totalRow }: {
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
