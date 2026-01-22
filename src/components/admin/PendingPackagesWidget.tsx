import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingPackages, useActivatePackage } from '@/hooks/use-pending-packages';
import { formatCurrency, formatDate } from '@/lib/wallet-utils';
import { Clock, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PendingPackagesWidget() {
  const navigate = useNavigate();
  const { data: pendingPackages, isLoading } = usePendingPackages();
  const activatePackage = useActivatePackage();

  if (isLoading) {
    return (
      <Card className="glass-card border-amber-500/20">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            Pending Packages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingPackages || pendingPackages.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-amber-500/20">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-amber-400">
          <Clock className="w-5 h-5" />
          Pending Packages ({pendingPackages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingPackages.slice(0, 3).map((pkg) => (
            <div
              key={pkg.package_id}
              className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-lg">{pkg.students.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pkg.package_types?.name || 'Custom Package'} - {formatCurrency(pkg.amount)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Created: {formatDate(pkg.created_at)}</span>
                    {pkg.start_date && (
                      <>
                        <span>•</span>
                        <span>Start: {formatDate(pkg.start_date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                  onClick={() => activatePackage.mutate(pkg.package_id)}
                  disabled={activatePackage.isPending}
                >
                  {activatePackage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      <CheckCircle className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}

          {pendingPackages.length > 3 && (
            <Button
              variant="ghost"
              className="w-full text-amber-400 hover:text-amber-300"
              onClick={() => navigate('/admin/pending-packages')}
            >
              View All Pending Packages ({pendingPackages.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
