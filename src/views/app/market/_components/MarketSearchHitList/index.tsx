import type { MarketSearchHit } from '@/domains/Market';
import MarketSearchHitCard from '../MarketSearchHitCard';
import type { MarketSearchHitListProps } from './index.type';
import styles from './style.module.less';

function hitLowestPrice(hit: MarketSearchHit): number {
  const tiers = hit.marketSaleInfo?.marketSaleTiers ?? [];
  if (tiers.length === 0) return 0;
  return Math.min(...tiers.map((tier) => tier.price));
}

function MarketSearchHitList({
  hits,
  priceLabel,
  typeLabel,
  updatedLabel,
  onOpen,
}: MarketSearchHitListProps) {
  if (hits.length === 0) return null;

  return (
    <div className={styles.hitList}>
      {hits.map((hit) => (
        <MarketSearchHitCard
          key={hit.resourceId}
          hit={hit}
          priceLabel={priceLabel(hitLowestPrice(hit))}
          typeLabel={typeLabel(hit)}
          updatedLabel={updatedLabel(hit)}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

export default MarketSearchHitList;
