import type { SearchResourceType } from '@/domains/Resource';
import type {
  MarketManagedListing,
  MarketOrder,
  MarketResourceDetail,
  MarketSearchHit,
} from '../entity/market';
import type { MarketSearchScope } from '../enum';

/** MarketService 接口：供依赖注入使用 */
export interface IMarketService {
  /** GET /resource/search/searchMarketResources */
  searchResources(params: SearchMarketResourcesRequest): Promise<SearchMarketResourcesResult>;
  /**
   * 集市资源详情：按 resourceType 分流 Note/Document getInfo，
   * 并以 offerVersion 作为 targetVersion。
   */
  getResourceDetail(params: GetMarketResourceDetailRequest): Promise<MarketResourceDetail>;
  /** POST /resource/market/publishSaleInfo */
  publishSaleInfo(params: PublishSaleInfoRequest): Promise<void>;
  /** POST /resource/market/offShelfSaleInfo */
  offShelfSaleInfo(params: OffShelfSaleInfoRequest): Promise<void>;
  /** POST /resource/market/purchaseResource — 钱包未完全对齐，UI 须演示文案 */
  purchaseResource(params: PurchaseResourceRequest): Promise<MarketOrder>;
  /** GET /resource/market/listOrders */
  listOrders(params: ListOrdersRequest): Promise<ListOrdersResult>;
}

/** 集市全文搜索请求 */
export interface SearchMarketResourcesRequest {
  keyword?: string;
  marketGroupId?: string;
  scope: MarketSearchScope;
  page: number;
  size: number;
}

/** 集市全文搜索分页结果 */
export interface SearchMarketResourcesResult {
  list: MarketSearchHit[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

/** 集市详情请求 */
export interface GetMarketResourceDetailRequest {
  resourceId: string;
  marketGroupId?: string;
  /** 售卖版本，传给 Note/Doc 的 targetVersion */
  offerVersion?: number;
  /** 已知类型可跳过猜测；缺省时先 Note 再 Document */
  resourceType?: SearchResourceType | string;
}

export interface PublishSaleTierRequest {
  price: number;
  grantedActions?: string[];
}

export interface PublishSaleInfoRequest {
  resourceId: string;
  marketGroupId: string;
  tagIds: string[];
  price: number;
  offerVersion?: number;
  reviewContentPercentage?: number;
  reviewActions?: string[];
  grantedActions?: string[];
}

export interface OffShelfSaleInfoRequest {
  resourceId: string;
  marketGroupId: string;
}

export interface PurchaseResourceRequest {
  resourceId: string;
  marketGroupId: string;
  offerId: string;
}

export interface ListOrdersRequest {
  page: number;
  size: number;
}

export interface ListOrdersResult {
  list: MarketOrder[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

export type { MarketManagedListing };
