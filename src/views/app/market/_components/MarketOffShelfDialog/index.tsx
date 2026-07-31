import AppFormDialog from '@/components/Overlay/AppFormDialog';
import { Button } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';
import type { MarketOffShelfDialogProps } from './index.type';
import styles from './style.module.less';

function MarketOffShelfDialog({
  isOpen,
  resourceName,
  priceLabel,
  auditMessage,
  labels,
  onOpenChange,
  onConfirmOffShelf,
  onResubmit,
}: MarketOffShelfDialogProps) {
  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={
        <span className={styles.titleWrap}>
          <AlertTriangle className={styles.warnIcon} size={18} aria-hidden="true" />
          {labels.title}
        </span>
      }
      size="md"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button variant="danger" onPress={onConfirmOffShelf}>
            {labels.confirm}
          </Button>
          <Button variant="primary" onPress={onResubmit}>
            {labels.resubmit}
          </Button>
        </div>
      }
    >
      <p className={styles.subtitle}>
        {resourceName} · {priceLabel}
      </p>
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <h4>{labels.effectSearchTitle}</h4>
          <p>{labels.effectSearchDesc}</p>
        </div>
        <div className={styles.infoCard}>
          <h4>{labels.effectBuyerTitle}</h4>
          <p>{labels.effectBuyerDesc}</p>
        </div>
      </div>
      {auditMessage ? (
        <div className={styles.alertBox} role="note">
          <h4>{labels.rejectExampleTitle}</h4>
          <p>{auditMessage}</p>
        </div>
      ) : null}
    </AppFormDialog>
  );
}

export default MarketOffShelfDialog;
