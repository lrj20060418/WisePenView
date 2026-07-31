import { Card } from '@heroui/react';
import { Folder } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { MarketFolderCardProps } from './index.type';
import styles from './style.module.less';

function MarketFolderCard({ folder, displayName, itemCountLabel, onOpen }: MarketFolderCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(folder);
    }
  };

  const coverUrl = folder.tagIcon?.trim() || '';

  return (
    <Card
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(folder)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.cover}>
        {coverUrl ? (
          <img className={styles.coverImage} src={coverUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.coverPlaceholder} aria-hidden="true">
            <Folder size={28} />
          </span>
        )}
        <span className={styles.folderBadge} aria-hidden="true">
          <Folder size={14} />
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{displayName}</h3>
        {folder.tagDesc ? <p className={styles.desc}>{folder.tagDesc}</p> : null}
        {itemCountLabel ? <p className={styles.meta}>{itemCountLabel}</p> : null}
      </div>
    </Card>
  );
}

export default MarketFolderCard;
