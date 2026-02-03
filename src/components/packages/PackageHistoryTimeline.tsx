import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getStatusBadgeClass } from '@/lib/wallet-utils';
import { Package, RefreshCw, Calendar, Clock, User, Wallet, BookOpen } from 'lucide-react';
import type { Package as PackageType } from '@/hooks/use-packages';

interface PackageHistoryTimelineProps {
  packages: PackageType[] | undefined;
  isLoading: boolean;
  teacherName?: string;
}

export function PackageHistoryTimeline({ packages, isLoading, teacherName }: PackageHistoryTimelineProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Package History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Package History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No package history available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort packages by date (newest first)
  const sortedPackages = [...packages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Package History & Renewals
          <Badge variant="outline" className="ml-auto">
            {packages.length} package{packages.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline items */}
          <div className="space-y-6">
            {sortedPackages.map((pkg, index) => {
              const lessonsRemaining = pkg.lessons_purchased - (pkg.lessons_used || 0);
              const completionPercent = pkg.lessons_purchased > 0 
                ? ((pkg.lessons_used || 0) / pkg.lessons_purchased) * 100 
                : 0;

              // Determine status during this package period
              let periodStatus: 'Active' | 'Grace' | 'Blocked' = 'Active';
              if (lessonsRemaining <= 0) {
                periodStatus = 'Blocked';
              } else if (lessonsRemaining <= 2) {
                periodStatus = 'Grace';
              }

              return (
                <div key={pkg.package_id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div 
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${
                      pkg.status === 'Active' 
                        ? 'bg-primary' 
                        : 'bg-muted-foreground'
                    }`}
                  >
                    {pkg.is_renewal && (
                      <RefreshCw className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Package card */}
                  <div className={`p-4 rounded-lg border ${
                    pkg.status === 'Active' 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border bg-muted/30'
                  }`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {pkg.package_types?.name || 'Custom Package'}
                          </span>
                          {pkg.is_renewal && (
                            <Badge variant="outline" className="text-xs">
                              Renewal
                            </Badge>
                          )}
                          {index === 0 && pkg.status === 'Active' && (
                            <Badge className="bg-primary text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {pkg.package_types?.description || '-'}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeClass(pkg.status === 'Active' ? periodStatus : 'Blocked')}>
                        {pkg.status}
                      </Badge>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="text-sm font-medium">
                            {pkg.start_date ? formatDate(pkg.start_date) : formatDate(pkg.payment_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">End Date</p>
                          <p className="text-sm font-medium">
                            {pkg.completed_date 
                              ? formatDate(pkg.completed_date) 
                              : pkg.next_payment_date 
                                ? formatDate(pkg.next_payment_date)
                                : 'Ongoing'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Amount Paid</p>
                          <p className="text-sm font-medium text-primary">
                            {formatCurrency(pkg.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Teacher</p>
                          <p className="text-sm font-medium">
                            {teacherName || 'Not assigned'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lessons progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Lessons Progress</span>
                        </div>
                        <span className="font-medium">
                          {pkg.lessons_used || 0} / {pkg.lessons_purchased} used
                          <span className="text-muted-foreground ml-2">
                            ({lessonsRemaining} remaining)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            completionPercent >= 100 
                              ? 'bg-destructive' 
                              : completionPercent >= 80 
                                ? 'bg-warning' 
                                : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(completionPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Duration info */}
                    {pkg.lesson_duration && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {pkg.lesson_duration} min lessons
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
