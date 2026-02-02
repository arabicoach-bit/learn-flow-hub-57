export function getWalletColor(balance: number): string {
  // Active: >= 3, Grace: 2 to -1, Blocked: <= -2
  if (balance >= 3) return 'wallet-positive';  // Active
  if (balance >= 0) return 'wallet-warning';   // Grace (approaching limit)
  if (balance >= -1) return 'wallet-negative'; // Grace (in debt)
  return 'wallet-critical';                     // Blocked (<= -2)
}

export function getWalletBgColor(balance: number): string {
  // Active: >= 3, Grace: 2 to -1, Blocked: <= -2
  if (balance >= 3) return 'bg-emerald-500/20';  // Active
  if (balance >= 0) return 'bg-amber-500/20';    // Grace (approaching limit)
  if (balance >= -1) return 'bg-red-500/20';     // Grace (in debt)
  return 'bg-red-900/30';                         // Blocked (<= -2)
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Active':
      return 'status-active';
    case 'Grace':
      return 'status-grace';
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
    case 'Grace':
      return 'bg-wallet-warning/20 text-wallet-warning';
    case 'Blocked':
      return 'bg-wallet-negative/20 text-wallet-negative';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
