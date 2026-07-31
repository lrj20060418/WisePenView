import type { MarketSearchHit } from '@/domains/Market';

export interface MarketSearchHitCardProps {
  hit: MarketSearchHit;
  priceLabel: string;
  typeLabel: string;
  updatedLabel: string;
  onOpen: (hit: MarketSearchHit) => void;
}
