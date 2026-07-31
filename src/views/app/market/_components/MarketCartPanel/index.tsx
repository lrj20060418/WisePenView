import AppIconButton from '@/components/Button/AppIconButton';
import { EmptyState } from '@/components/Feedback';
import { Checkbox } from '@/components/Input';
import { Button } from '@heroui/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { MarketCartPanelProps } from './index.type';
import styles from './style.module.less';

function MarketCartPanel({
  items,
  labels,
  priceLabel,
  onBack,
  onToggleItem,
  onToggleAll,
  onRemove,
  onCheckout,
}: MarketCartPanelProps) {
  const selectedItems = items.filter((item) => item.selected);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          {labels.back}
        </button>
        <h1 className={styles.title}>{labels.title}</h1>
        <p className={styles.subtitle}>{labels.subtitle}</p>
      </header>

      {items.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState title={labels.empty} description={labels.emptyHint ?? ''} />
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <Checkbox isSelected={allSelected} onChange={onToggleAll}>
              {labels.selectAll}
            </Checkbox>
            <span className={styles.count}>{items.length}</span>
          </div>

          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <Checkbox
                  aria-label={item.resourceName}
                  isSelected={item.selected}
                  onChange={() => onToggleItem(item.id)}
                />
                <img className={styles.cover} src={item.coverImageUrl} alt="" loading="lazy" />
                <div className={styles.meta}>
                  <h3 className={styles.itemTitle}>{item.resourceName}</h3>
                  <p className={styles.itemSub}>
                    {labels.seller} {item.ownerName} · {item.college}
                  </p>
                  <p className={styles.itemPrice}>{priceLabel(item.price)}</p>
                </div>
                <AppIconButton
                  icon={<Trash2 size={16} aria-hidden="true" />}
                  label={labels.remove}
                  size="sm"
                  onPress={() => onRemove(item.id)}
                />
              </li>
            ))}
          </ul>

          <footer className={styles.footer}>
            <div>
              <span className={styles.totalLabel}>{labels.total}</span>
              <strong className={styles.totalValue}>{priceLabel(total)}</strong>
            </div>
            <Button variant="primary" isDisabled={selectedItems.length === 0} onPress={onCheckout}>
              {labels.checkout}
            </Button>
          </footer>
        </>
      )}
    </div>
  );
}

export default MarketCartPanel;
