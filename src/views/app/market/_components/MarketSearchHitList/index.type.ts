import type { MarketSearchHit } from '@/domains/Market';

export interface MarketSearchHitListProps {
  hits: MarketSearchHit[];
  priceLabel: (price: number) => string;
  typeLabel: (hit: MarketSearchHit) => string;
  updatedLabel: (hit: MarketSearchHit) => string;
  onOpen: (hit: MarketSearchHit) => void;
}
