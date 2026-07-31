import { EmptyState, LoadingState, ResultState } from '@/components/Feedback';
import { Button } from '@heroui/react';
import type { MarketTabStatusProps } from './index.type';
import styles from './style.module.less';

function MarketTabStatus({
  status,
  emptyTitle,
  emptyHint,
  loadingText,
  errorTitle,
  errorHint,
  retryLabel,
  onRetry,
  children,
}: MarketTabStatusProps) {
  if (status === 'loading') {
    return (
      <div className={styles.wrap}>
        <LoadingState label={loadingText} size="lg" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.wrap}>
        <ResultState
          status="error"
          title={errorTitle}
          subTitle={errorHint}
          extra={
            <Button variant="primary" onPress={onRetry}>
              {retryLabel}
            </Button>
          }
        />
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className={styles.wrap}>
        <EmptyState title={emptyTitle} description={emptyHint} />
      </div>
    );
  }

  return <>{children}</>;
}

export default MarketTabStatus;
