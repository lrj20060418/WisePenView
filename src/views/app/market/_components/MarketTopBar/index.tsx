import { Button } from '@heroui/react';
import { Plus, ShoppingCart } from 'lucide-react';
import type { MarketTopBarProps } from './index.type';
import styles from './style.module.less';

function MarketTopBar({
  discoverLabel,
  myMarketLabel,
  publishLabel,
  cartLabel,
  cartCount,
  activeKey,
  navAriaLabel,
  searchSlot,
  onDiscover,
  onMyMarket,
  onPublish,
  onCart,
}: MarketTopBarProps) {
  return (
    <div className={styles.bar} role="navigation" aria-label={navAriaLabel}>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === 'browse'}
          className={`${styles.tab} ${activeKey === 'browse' ? styles.tabActive : ''}`}
          onClick={onDiscover}
        >
          {discoverLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKey === 'myMarket'}
          className={`${styles.tab} ${activeKey === 'myMarket' ? styles.tabActive : ''}`}
          onClick={onMyMarket}
        >
          {myMarketLabel}
        </button>
      </div>
      {searchSlot ? <div className={styles.searchSlot}>{searchSlot}</div> : null}
      <div className={styles.actions}>
        <Button variant={activeKey === 'publish' ? 'primary' : 'secondary'} onPress={onPublish}>
          <Plus size={16} aria-hidden="true" />
          {publishLabel}
        </Button>
        <Button variant={activeKey === 'cart' ? 'primary' : 'secondary'} onPress={onCart}>
          <ShoppingCart size={16} aria-hidden="true" />
          {cartLabel}
          {cartCount > 0 ? <span className={styles.badge}>{cartCount}</span> : null}
        </Button>
      </div>
    </div>
  );
}

export default MarketTopBar;
