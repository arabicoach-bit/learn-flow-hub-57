// Map database status values to display labels
export function getStatusDisplayLabel(status: string): string {
  switch (status) {
    case 'Active':
      return 'Active';
    // New canonical values
    case 'Temporary Stop':
      return 'Temporary Stop';
    case 'Left':
      return 'Left';
    // Backwards-compat (should no longer exist in DB)
    case 'Grace':
      return 'Temporary Stop';
    case 'Blocked':
      return 'Left';
    default:
      return status;
  }
}

// Show "Overdue" label when wallet is <= 0
export function getWalletDisplayLabel(walletBalance: number): string {
  if (walletBalance <= 0) return 'Overdue';
  return `${walletBalance}`;
}

export function getWalletColor(balance: number): string {
  // Wallet is always >= 0 now. Active: >= 3, Grace: 1-2, Warning: 0
  if (balance >= 3) return 'wallet-positive';  // Active
  if (balance >= 1) return 'wallet-warning';   // Grace (approaching limit)
  return 'wallet-negative';                     // Zero balance
}

export function getWalletBgColor(balance: number): string {
  // Wallet is always >= 0 now
  if (balance >= 3) return 'bg-emerald-500/20';  // Active
  if (balance >= 1) return 'bg-amber-500/20';    // Grace
  return 'bg-red-500/20';                         // Zero
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
