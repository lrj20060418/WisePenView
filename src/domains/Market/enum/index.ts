import type { EnumValue } from '@/utils/enum';
import { createEnum } from '@/utils/enum';

/** 集市售卖状态：与后端 MarketSaleStatus 字面值一致 */
export const MARKET_SALE_STATUS = createEnum([
  { value: 'PENDING_REVIEW', key: 'PENDING_REVIEW', label: '待审核' },
  { value: 'PUBLISHED', key: 'PUBLISHED', label: '已上架' },
  { value: 'REJECTED', key: 'REJECTED', label: '已驳回' },
  { value: 'BANNED', key: 'BANNED', label: '已封禁' },
  { value: 'OFF_SHELF', key: 'OFF_SHELF', label: '已下架' },
] as const);

/** 集市搜索范围：与后端 SearchScope 字面值一致 */
export const MARKET_SEARCH_SCOPE = createEnum([
  { value: 'ALL', key: 'ALL', label: '全部' },
  { value: 'DOCUMENT', key: 'DOCUMENT', label: '文档' },
  { value: 'NOTE', key: 'NOTE', label: '笔记' },
] as const);

export type MarketSaleStatus = EnumValue<typeof MARKET_SALE_STATUS>;
export type MarketSearchScope = EnumValue<typeof MARKET_SEARCH_SCOPE>;

export const normalizeMarketSaleStatus = (raw: unknown): MarketSaleStatus => {
  if (typeof raw === 'string' && raw in MARKET_SALE_STATUS.configs) {
    return raw as MarketSaleStatus;
  }
  return MARKET_SALE_STATUS.PENDING_REVIEW;
};
