import type { ReactNode } from 'react';

export interface MarketTopBarProps {
  discoverLabel: string;
  myMarketLabel: string;
  publishLabel: string;
  cartLabel: string;
  cartCount: number;
  /** 未传入时不高亮任一主导航（如管理页 / 详情页） */
  activeKey?: 'browse' | 'myMarket' | 'publish' | 'cart';
  navAriaLabel: string;
  /** 浏览态顶栏中间的搜索槽 */
  searchSlot?: ReactNode;
  onDiscover: () => void;
  onMyMarket: () => void;
  onPublish: () => void;
  onCart: () => void;
}
