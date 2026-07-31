import type { MarketListing } from '../../mockData';

export interface MarketListingCardProps {
  listing: MarketListing;
  priceLabel?: string;
  showOnSaleBadge?: boolean;
  onSaleLabel?: string;
  onOpen?: (listing: MarketListing) => void;
}
