import { Card, Chip } from '@heroui/react';
import { Building2, Heart, MessageCircle, Star, User } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { listingOnSale, listingPrice } from '../../mockData';
import type { MarketListingCardProps } from './index.type';
import styles from './style.module.less';

function MarketListingCard({
  listing,
  priceLabel,
  showOnSaleBadge = false,
  onSaleLabel,
  onOpen,
}: MarketListingCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.(listing);
    }
  };

  const price = priceLabel ?? `¥${listingPrice(listing)} Coin`;
  const ownerName = listing.ownerInfo.nickname?.trim() || '—';
  const college = listing.ownerInfo.college?.trim() || '—';

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(listing)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.cover}>
        <img className={styles.coverImage} src={listing.coverImageUrl} alt="" loading="lazy" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{listing.resourceName}</h3>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <User size={12} aria-hidden="true" />
            {ownerName}
          </span>
          <span className={styles.metaDivider}>|</span>
          <span className={styles.metaItem}>
            <Building2 size={12} aria-hidden="true" />
            {college}
          </span>
        </div>
        <div className={styles.footer}>
          <div className={styles.priceRow}>
            <span className={styles.price}>{price}</span>
            {showOnSaleBadge && listingOnSale(listing) && onSaleLabel ? (
              <Chip size="sm" variant="soft" className={styles.onSaleBadge}>
                <Chip.Label>{onSaleLabel}</Chip.Label>
              </Chip>
            ) : null}
          </div>
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <Heart size={12} aria-hidden="true" />
              {listing.likes}
            </span>
            <span className={styles.statItem}>
              <Star size={12} aria-hidden="true" />
              {listing.favorites}
            </span>
            <span className={styles.statItem}>
              <MessageCircle size={12} aria-hidden="true" />
              {listing.comments}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default MarketListingCard;
