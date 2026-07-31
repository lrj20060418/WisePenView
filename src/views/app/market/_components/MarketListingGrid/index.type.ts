import type { MarketListing } from '../../mockData';

export interface MarketListingGridProps {
  listings: MarketListing[];
  priceLabel: (price: number) => string;
  emptyDescription: string;
  showOnSaleBadge?: boolean;
  onSaleLabel?: string;
  onOpen?: (listing: MarketListing) => void;
}
