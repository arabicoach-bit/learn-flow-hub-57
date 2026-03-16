import { getWalletBadgeClasses } from '@/lib/wallet-utils';

interface WalletBadgeProps {
  balance: number;
  /** 'badge' = compact inline badge (tables), 'chip' = larger chip with label (cards) */
  variant?: 'badge' | 'chip';
  showLabel?: boolean;
}

/**
 * Unified Wallet display component used across all views.
 * Color-coded by balance: >=5 green, >=3 lime, >=1 amber, 0 orange, <0 red.
 */
export function WalletBadge({ balance, variant = 'badge', showLabel = false }: WalletBadgeProps) {
  const classes = getWalletBadgeClasses(balance);

  if (variant === 'chip') {
    return (
      <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${classes}`}>
        💰 {balance}{showLabel ? ' lessons' : ''}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded ${classes}`}>
      💰 {balance}
    </span>
  );
}
