import type { MarketCartItem } from '../../mockData';

export interface MarketCartPanelProps {
  items: MarketCartItem[];
  labels: {
    title: string;
    subtitle: string;
    selectAll: string;
    remove: string;
    total: string;
    checkout: string;
    empty: string;
    emptyHint?: string;
    back: string;
    seller: string;
  };
  priceLabel: (price: number) => string;
  onBack: () => void;
  onToggleItem: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}
