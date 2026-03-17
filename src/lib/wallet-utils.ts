// Map database status values to display labels
export function getStatusDisplayLabel(status: string): string {
  switch (status) {
    case 'Active':
      return 'Active';
    case 'Temporary Stop':
      return 'Stop';
    case 'Left':
      return 'Left';
    // Backwards-compat (should no longer exist in DB)
    case 'Grace':
      return 'Stop';
    case 'Blocked':
      return 'Left';
    default:
      return status;
  }
}

export type PaymentStatusType = 'Pending' | 'Paid' | 'Renewal' | '';

/**
 * Compute a student's payment status from their activity status, wallet balance,
 * and whether any of their packages has a pending payment.
 */
export function getPaymentStatus(
  studentStatus: string,
  walletBalance: number,
  hasAnyPendingPackage: boolean
): PaymentStatusType {
  // Any student with unpaid packages shows as Pending, regardless of activity status
  if (hasAnyPendingPackage) return 'Pending';
  if (studentStatus !== 'Active') return '';
  if (walletBalance > 0) return 'Paid';
  return 'Renewal';
}

export function getPaymentStatusBadgeClass(status: PaymentStatusType): string {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'Pending':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'Renewal':
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
    default:
      return '';
  }
}

export function getWalletColor(balance: number): string {
  if (balance >= 5) return 'text-emerald-600';
  if (balance >= 3) return 'text-lime-600';
  if (balance >= 1) return 'text-amber-600';
  if (balance === 0) return 'text-orange-600';
  return 'text-red-600';
}

export function getWalletBgColor(balance: number): string {
  if (balance >= 3) return 'bg-emerald-500/20';
  if (balance >= 1) return 'bg-amber-500/20';
  return 'bg-red-500/20';
}

/** Combined text + background classes for wallet badge */
export function getWalletBadgeClasses(balance: number): string {
  if (balance >= 5) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  if (balance >= 3) return 'bg-lime-500/15 text-lime-700 dark:text-lime-400';
  if (balance >= 1) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  if (balance === 0) return 'bg-orange-500/15 text-orange-700 dark:text-orange-400';
  return 'bg-red-500/15 text-red-700 dark:text-red-400';
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Active':
      return 'status-active';
    case 'Temporary Stop':
    case 'Grace':
      return 'status-grace';
    case 'Left':
    case 'Blocked':
      return 'status-blocked';
    case 'New':
      return 'status-new';
    case 'Contacted':
      return 'status-contacted';
    case 'Interested':
      return 'status-interested';
    case 'Converted':
      return 'status-converted';
    case 'Lost':
      return 'status-lost';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-wallet-positive/20 text-wallet-positive';
    case 'Temporary Stop':
    case 'Grace':
      return 'bg-wallet-warning/20 text-wallet-warning';
    case 'Left':
    case 'Blocked':
      return 'bg-wallet-negative/20 text-wallet-negative';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatCurrency(amount: number, currency: 'AED' | 'EGP' = 'AED'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalary(amount: number): string {
  return formatCurrency(amount, 'EGP');
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}
