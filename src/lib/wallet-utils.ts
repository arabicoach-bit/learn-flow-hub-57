export function getWalletColor(balance: number): string {
  if (balance >= 5) return 'wallet-positive';
  if (balance >= 3) return 'wallet-low';
  if (balance >= 1) return 'wallet-warning';
  if (balance === 0) return 'wallet-zero';
  if (balance >= -2) return 'wallet-negative';
  return 'wallet-critical';
}

export function getWalletBgColor(balance: number): string {
  if (balance >= 5) return 'bg-emerald-500/20';
  if (balance >= 3) return 'bg-lime-500/20';
  if (balance >= 1) return 'bg-amber-500/20';
  if (balance === 0) return 'bg-orange-500/20';
  if (balance >= -2) return 'bg-red-500/20';
  return 'bg-red-900/30';
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
