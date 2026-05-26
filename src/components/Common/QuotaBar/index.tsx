import { ProgressBar } from '@heroui/react';
import type { QuotaBarProps } from './index.type';
import styles from './style.module.less';

function QuotaBar({ used = 0, limit }: QuotaBarProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const getProgressFillClassName = (): string => {
    if (percentage >= 100) {
      return styles.quotaBarFillDanger;
    } else if (percentage >= 80) {
      return styles.quotaBarFillWarning;
    } else {
      return styles.quotaBarFillNormal;
    }
  };

  return (
    <div className={styles.quotaBar}>
      <ProgressBar aria-label="额度使用进度" className={styles.quotaBarProgress} value={percentage}>
        <ProgressBar.Track className={styles.quotaBarTrack}>
          <ProgressBar.Fill className={`${styles.quotaBarFill} ${getProgressFillClassName()}`} />
        </ProgressBar.Track>
        <ProgressBar.Output className={styles.quotaBarText}>
          {`${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </ProgressBar.Output>
      </ProgressBar>
    </div>
  );
}

export default QuotaBar;
