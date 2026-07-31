import type { MarketOrder, MarketResourceDetail, MarketSearchHit } from '../entity/market';
import { MARKET_SALE_STATUS, MARKET_SEARCH_SCOPE } from '../enum';
import { MarketServicesMap } from '../mapper/MarketServices.map';
import type {
  GetMarketResourceDetailRequest,
  IMarketService,
  ListOrdersRequest,
  ListOrdersResult,
  OffShelfSaleInfoRequest,
  PublishSaleInfoRequest,
  PurchaseResourceRequest,
  SearchMarketResourcesRequest,
  SearchMarketResourcesResult,
} from '../service/index.type';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const HIGHLIGHT_PRE = '<em class="wp-highlight">';
const HIGHLIGHT_POST = '</em>';

const wrapHighlight = (text: string, keyword: string): string => {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(escaped, 'gi'),
    (match) => `${HIGHLIGHT_PRE}${match}${HIGHLIGHT_POST}`
  );
};

const MOCK_HITS: MarketSearchHit[] = [
  {
    resourceId: 'res-1',
    marketGroupId: 'mg-1',
    resourceType: 'note',
    resourceName: '采访真题与提问技巧笔记',
    ownerId: 'u-1',
    marketSaleInfo: {
      reviewContentPercentage: 20,
      marketSaleTiers: [{ offerId: 'tier-1', price: 12 }],
      status: MARKET_SALE_STATUS.PUBLISHED,
      offerVersion: 1,
    },
    highlightContent: '采访准备与选题 · 提问设计与追问技巧',
    updateTime: '2026-05-18 10:20:00',
  },
  {
    resourceId: 'res-2',
    marketGroupId: 'mg-2',
    resourceType: 'pdf',
    resourceName: '数据结构期末复习提纲.pdf',
    ownerId: 'u-2',
    marketSaleInfo: {
      reviewContentPercentage: 15,
      marketSaleTiers: [{ offerId: 'tier-2', price: 8 }],
      status: MARKET_SALE_STATUS.PUBLISHED,
      offerVersion: 1,
    },
    highlightContent: '线性表、树与图 · 排序查找复杂度对照',
    updateTime: '2026-05-12 14:05:00',
  },
  {
    resourceId: 'res-3',
    marketGroupId: 'mg-cs',
    resourceType: 'docx',
    resourceName: '操作系统概念精炼.docx',
    ownerId: 'u-3',
    marketSaleInfo: {
      reviewContentPercentage: 10,
      marketSaleTiers: [{ offerId: 'tier-3', price: 15 }],
      status: MARKET_SALE_STATUS.PUBLISHED,
      offerVersion: 2,
    },
    highlightContent: '进程调度 · 虚拟内存 · 死锁处理',
    updateTime: '2026-04-30 09:40:00',
  },
  {
    resourceId: 'res-4',
    marketGroupId: 'mg-news',
    resourceType: 'note',
    resourceName: '新闻写作结构范例',
    ownerId: 'u-1',
    marketSaleInfo: {
      reviewContentPercentage: 25,
      marketSaleTiers: [{ offerId: 'tier-4', price: 6 }],
      status: MARKET_SALE_STATUS.OFF_SHELF,
      offerVersion: 1,
    },
    highlightContent: '倒金字塔结构与导语写作',
    updateTime: '2026-03-22 16:18:00',
  },
];

const matchesScope = (
  hit: MarketSearchHit,
  scope: SearchMarketResourcesRequest['scope']
): boolean => {
  if (scope === MARKET_SEARCH_SCOPE.ALL) return true;
  const isNote = hit.resourceType === 'note' || hit.resourceType === 'drawio';
  if (scope === MARKET_SEARCH_SCOPE.NOTE) return isNote;
  if (scope === MARKET_SEARCH_SCOPE.DOCUMENT) return !isNote;
  return true;
};

const searchResources = async (
  params: SearchMarketResourcesRequest
): Promise<SearchMarketResourcesResult> => {
  await delay(220);
  const keyword = params.keyword?.trim().toLowerCase() ?? '';
  const filtered = MOCK_HITS.filter((hit) => {
    if (!matchesScope(hit, params.scope)) return false;
    if (params.marketGroupId && hit.marketGroupId !== params.marketGroupId) return false;
    if (!keyword) return true;
    return (
      hit.resourceName.toLowerCase().includes(keyword) ||
      (hit.highlightContent ?? '').toLowerCase().includes(keyword)
    );
  }).map((hit) => {
    if (!keyword) return hit;
    return {
      ...hit,
      resourceName: wrapHighlight(hit.resourceName, params.keyword?.trim() ?? ''),
      highlightContent: hit.highlightContent
        ? wrapHighlight(hit.highlightContent, params.keyword?.trim() ?? '')
        : null,
    };
  });

  const page = Math.max(1, params.page);
  const size = Math.max(1, params.size);
  const start = (page - 1) * size;
  const list = filtered.slice(start, start + size);
  const total = filtered.length;
  const totalPage = Math.max(1, Math.ceil(total / size));

  return { list, total, page, size, totalPage };
};

const getResourceDetail = async (
  params: GetMarketResourceDetailRequest
): Promise<MarketResourceDetail> => {
  await delay(180);
  const hit = MOCK_HITS.find((item) => item.resourceId === params.resourceId) ?? MOCK_HITS[0];
  const sale = hit.marketSaleInfo ?? {
    reviewContentPercentage: 0,
    marketSaleTiers: [{ offerId: 'tier-0', price: 0 }],
    status: MARKET_SALE_STATUS.PUBLISHED,
    offerVersion: 1,
  };
  return {
    resourceId: params.resourceId || hit.resourceId,
    marketGroupId: params.marketGroupId || hit.marketGroupId,
    resourceName: hit.resourceName.replace(/<[^>]+>/g, ''),
    resourceType: hit.resourceType,
    ownerId: hit.ownerId,
    ownerInfo: {
      nickname: MarketServicesMap.isMarketNoteLikeType(hit.resourceType) ? '林知夏' : 'Mock User',
      college: '复旦大学',
      bio: '集市资料作者（mock）',
    },
    preview: hit.highlightContent?.replace(/<[^>]+>/g, '') ?? '',
    description: hit.highlightContent?.replace(/<[^>]+>/g, '') ?? '',
    coverImageUrl: `/market-covers/doc-${MarketServicesMap.isMarketNoteLikeType(hit.resourceType) ? 'teal' : 'blue'}.svg`,
    tags: [],
    likes: 16,
    favorites: 5,
    comments: 0,
    marketSaleInfo: {
      ...sale,
      offerVersion: params.offerVersion ?? sale.offerVersion,
    },
    updateTime: hit.updateTime,
    authors: ['林知夏'],
  };
};

const publishSaleInfo = async (_params: PublishSaleInfoRequest): Promise<void> => {
  await delay(200);
};

const offShelfSaleInfo = async (_params: OffShelfSaleInfoRequest): Promise<void> => {
  await delay(150);
};

const purchaseResource = async (params: PurchaseResourceRequest): Promise<MarketOrder> => {
  await delay(250);
  const hit = MOCK_HITS.find((item) => item.resourceId === params.resourceId);
  return {
    orderId: `order-${Date.now()}`,
    resourceId: params.resourceId,
    marketGroupId: params.marketGroupId,
    offerVersion: 1,
    paidPrice: hit?.marketSaleInfo?.marketSaleTiers[0]?.price ?? 12,
    createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    resourceName: hit?.resourceName.replace(/<[^>]+>/g, '') ?? params.resourceId,
  };
};

const listOrders = async (params: ListOrdersRequest): Promise<ListOrdersResult> => {
  await delay(200);
  const all: MarketOrder[] = [
    {
      orderId: 'order-1',
      resourceId: 'res-1',
      marketGroupId: 'mg-1',
      offerVersion: 1,
      paidPrice: 12,
      createTime: '2026-05-20 11:00:00',
      resourceName: '新闻采访真题合集 2023-2025',
    },
    {
      orderId: 'order-2',
      resourceId: 'res-2',
      marketGroupId: 'mg-2',
      offerVersion: 1,
      paidPrice: 8,
      createTime: '2026-05-18 09:30:00',
      resourceName: '数据结构期末复习提纲',
    },
  ];
  const start = (params.page - 1) * params.size;
  const list = all.slice(start, start + params.size);
  return {
    list,
    total: all.length,
    page: params.page,
    size: params.size,
    totalPage: Math.max(1, Math.ceil(all.length / params.size)),
  };
};

export const MarketServicesMock: IMarketService = {
  searchResources,
  getResourceDetail,
  publishSaleInfo,
  offShelfSaleInfo,
  purchaseResource,
  listOrders,
};
