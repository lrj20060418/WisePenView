import { EmptyState } from '@/components/Feedback';
import { useNavigate } from 'react-router-dom';
import { MARKET_PATH } from '../../market.paths';
import { listingPrice, type MarketListing } from '../../mockData';
import MarketListingCard from '../MarketListingCard';
import type { MarketListingGridProps } from './index.type';
import styles from './style.module.less';

function MarketListingGrid({
  listings,
  priceLabel,
  emptyDescription,
  showOnSaleBadge = false,
  onSaleLabel,
  onOpen,
}: MarketListingGridProps) {
  const navigate = useNavigate();

  if (listings.length === 0) {
    return (
      <div className={styles.emptyList}>
        <EmptyState title={emptyDescription} description="" />
      </div>
    );
  }

  const handleOpen = (listing: MarketListing) => {
    if (onOpen) {
      onOpen(listing);
      return;
    }
    navigate(
      MARKET_PATH.item(listing.resourceId, {
        groupId: listing.marketGroupId || undefined,
        offerVersion: listing.marketSaleInfo.offerVersion || undefined,
        type: listing.resourceType,
      })
    );
  };

  return (
    <div className={styles.listingGrid}>
      {listings.map((listing) => (
        <MarketListingCard
          key={listing.id}
          listing={listing}
          priceLabel={priceLabel(listingPrice(listing))}
          showOnSaleBadge={showOnSaleBadge}
          onSaleLabel={onSaleLabel}
          onOpen={handleOpen}
        />
      ))}
    </div>
  );
}

export default MarketListingGrid;
