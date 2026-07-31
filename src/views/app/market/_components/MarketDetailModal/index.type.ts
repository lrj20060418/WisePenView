export interface MarketDetailTarget {
  resourceId: string;
  marketGroupId?: string;
  offerVersion?: number;
  resourceType?: string;
}

export interface MarketDetailModalProps {
  target: MarketDetailTarget | null;
  onClose: () => void;
}
