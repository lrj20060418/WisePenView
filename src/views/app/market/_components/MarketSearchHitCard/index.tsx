import { Card, Chip } from '@heroui/react';
import type { KeyboardEvent } from 'react';
import type { MarketSearchHitCardProps } from './index.type';
import styles from './style.module.less';

function MarketSearchHitCard({
  hit,
  priceLabel,
  typeLabel,
  updatedLabel,
  onOpen,
}: MarketSearchHitCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(hit);
    }
  };

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(hit)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.topRow}>
        <h3 className={styles.title} dangerouslySetInnerHTML={{ __html: hit.resourceName }} />
        <span className={styles.price}>{priceLabel}</span>
      </div>
      <div className={styles.metaRow}>
        <Chip size="sm" variant="soft" className={styles.typeChip}>
          <Chip.Label>{typeLabel}</Chip.Label>
        </Chip>
        {updatedLabel ? <span>{updatedLabel}</span> : null}
      </div>
      {hit.highlightContent ? (
        <p className={styles.snippet} dangerouslySetInnerHTML={{ __html: hit.highlightContent }} />
      ) : null}
    </Card>
  );
}

export default MarketSearchHitCard;
