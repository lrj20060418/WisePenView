import { Card } from '@heroui/react';
import { Users } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { MarketGroupCardProps } from './index.type';
import styles from './style.module.less';

function MarketGroupCardView({
  group,
  listingCountLabel,
  memberCountLabel,
  onOpen,
}: MarketGroupCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(group);
    }
  };

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(group)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.cover}>
        {group.groupCoverUrl ? (
          <img className={styles.coverImage} src={group.groupCoverUrl} alt="" loading="lazy" />
        ) : null}
        <div className={styles.coverScrim} aria-hidden="true" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{group.groupName}</h3>
        {group.groupDesc ? <p className={styles.desc}>{group.groupDesc}</p> : null}
        <div className={styles.meta}>
          <span>
            <Users size={12} aria-hidden="true" />
            {memberCountLabel}
          </span>
          {listingCountLabel ? <span>{listingCountLabel}</span> : null}
        </div>
      </div>
    </Card>
  );
}

export default MarketGroupCardView;
