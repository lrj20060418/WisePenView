import type { FolderTableLoadMore } from '@/components/Table';
import type { ResourceIconType } from '@/domains/Resource';

/** 集市 FolderTable 行：搜索命中与组内资源统一为此结构 */
export interface MarketResourceTableItem {
  id: string;
  name: string;
  resourceType?: string;
  resourceIconType?: ResourceIconType;
  ownerLabel: string;
  price: number;
}

export interface MarketResourceTableProps {
  items: MarketResourceTableItem[];
  onOpen: (item: MarketResourceTableItem) => void;
  ariaLabel?: string;
  className?: string;
  loading?: boolean;
  totalCount?: number;
  loadMore?: FolderTableLoadMore;
  emptyText?: string;
  emptyDescription?: string;
}
