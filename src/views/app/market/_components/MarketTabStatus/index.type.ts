import type { ReactNode } from 'react';
import type { MarketListStatus } from '../../mockData';

export interface MarketTabStatusProps {
  status: MarketListStatus;
  emptyTitle: string;
  emptyHint: string;
  loadingText: string;
  errorTitle: string;
  errorHint: string;
  retryLabel: string;
  onRetry: () => void;
  children: ReactNode;
}
