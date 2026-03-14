import { Package, TrendingUp, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { KPICard, SectionHeader, MonthlyTable, ComparisonRow } from './QuarterShared';
import type { QuarterPackageKPIs, MonthlyStats } from '@/hooks/use-quarter-analysis';

interface Props {
  data: QuarterPackageKPIs;
  monthlyBreakdown: MonthlyStats[];
  prevData?: QuarterPackageKPIs | null;
  comparePrevious: boolean;
}

export function QuarterPackagesSection({ data, monthlyBreakdown, prevData, comparePrevious }: Props) {
  return (
    <>
      <SectionHeader title="Packages" emoji="📦" theme="packages" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <KPICard title="Total Packages" value={data.totalPackages} icon={<Package className="w-5 h-5" />} theme="packages" />
        <KPICard title="New" value={data.newPackages} icon={<Package className="w-5 h-5" />} variant="success" theme="packages" />
        <KPICard title="Renewals" value={data.renewals} icon={<TrendingUp className="w-5 h-5" />} theme="packages" />
        <KPICard title="In Progress" value={data.runningPackages} icon={<CheckCircle className="w-5 h-5" />} variant="success" theme="packages" />
        <KPICard title="Finished" value={data.completedPackages} icon={<CheckCircle className="w-5 h-5" />} theme="packages" />
        <KPICard title="Pending" value={data.pendingPayments} icon={<AlertTriangle className="w-5 h-5" />} variant="warning" theme="packages" />
        <KPICard title="Paid Revenue" value={`AED ${data.paidRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} variant="success" theme="packages" />
      </div>
      {comparePrevious && prevData && (
        <ComparisonRow items={[
          { label: 'Total', current: data.totalPackages, previous: prevData.totalPackages },
          { label: 'Revenue', current: data.paidRevenue, previous: prevData.paidRevenue },
          { label: 'Renewals', current: data.renewals, previous: prevData.renewals },
        ]} />
      )}
      <MonthlyTable
        theme="packages"
        headers={['Month', 'Total', 'New', 'Renewals', 'Paid Revenue (AED)', 'Pending']}
        rows={monthlyBreakdown.map(m => [m.monthLabel, String(m.totalPackages), String(m.newPackages), String(m.renewals), m.paidRevenue.toLocaleString(), String(m.pendingPayments)])}
        totalRow={['Quarter Total', String(data.totalPackages), String(data.newPackages), String(data.renewals), data.paidRevenue.toLocaleString(), String(data.pendingPayments)]}
      />
    </>
  );
}
