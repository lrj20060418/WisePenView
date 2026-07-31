import AppFormDialog from '@/components/Overlay/AppFormDialog';
import type { MarketPurchaseDialogProps } from './index.type';
import styles from './style.module.less';

function MarketPurchaseDialog({
  isOpen,
  resourceName,
  priceLabel,
  balanceLabel,
  labels,
  onOpenChange,
  onConfirm,
}: MarketPurchaseDialogProps) {
  return (
    <AppFormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.title}
      confirmText={labels.confirm}
      cancelText={labels.cancel}
      size="md"
      onSubmit={() => onConfirm()}
    >
      <div className={styles.body}>
        <div className={styles.row}>
          <span className={styles.label}>{labels.resource}</span>
          <span className={styles.value}>{resourceName}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{labels.price}</span>
          <span className={styles.price}>{priceLabel}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{labels.balance}</span>
          <span className={styles.value}>{balanceLabel}</span>
        </div>
        <p className={styles.hint}>{labels.hint}</p>
      </div>
    </AppFormDialog>
  );
}

export default MarketPurchaseDialog;
