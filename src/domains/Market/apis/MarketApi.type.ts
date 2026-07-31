import type { PageApiRequest, PageR } from '@/apis/api.type';
import type { ResourceActionApiKey } from '@/domains/Resource/apis/ResourceApi.type';

/** GET /resource/search/searchMarketResources */
export interface SearchMarketResourcesApiRequest extends PageApiRequest {
  keyword?: string;
  marketGroupId?: string;
  scope: string;
}

export interface MarketSaleTierApiResponse {
  offerId?: string;
  price?: number;
  grantedActionsMask?: number;
  grantedActions?: ResourceActionApiKey[] | null;
  createAt?: string;
}

export interface MarketSaleInfoApiResponse {
  reviewActionsMask?: number;
  reviewActions?: ResourceActionApiKey[] | null;
  reviewContentPercentage?: number;
  marketSaleTiers?: MarketSaleTierApiResponse[] | null;
  status?: string;
  offerVersion?: number;
  auditMessage?: string;
  auditAt?: string;
}

export interface MarketSearchHitItemApiResponse {
  resourceId: string;
  marketGroupId?: string | null;
  resourceType: string;
  resourceName: string;
  ownerId?: string | number | null;
  marketSaleInfo?: MarketSaleInfoApiResponse | null;
  highlightContent?: string | null;
  updateTime?: string | null;
}

export type SearchMarketResourcesApiResponse = PageR<MarketSearchHitItemApiResponse>;

/** POST /resource/market/publishSaleInfo */
export interface MarketSaleTierPublishApiRequest {
  grantedActions: ResourceActionApiKey[];
  price: number;
}

export interface PublishSaleInfoApiRequest {
  resourceId: string;
  marketGroupId: string;
  tagIds: string[];
  reviewContentPercentage: number;
  reviewActions?: ResourceActionApiKey[];
  marketSaleTiers: MarketSaleTierPublishApiRequest[];
  offerVersion: number;
}

/** POST /resource/market/offShelfSaleInfo */
export interface OffShelfSaleInfoApiRequest {
  resourceId: string;
  marketGroupId: string;
}

/** POST /resource/market/purchaseResource */
export interface PurchaseResourceApiRequest {
  offerId: string;
  resourceId: string;
  marketGroupId: string;
}

export interface MarketOrderApiResponse {
  orderId?: string;
  traceId?: string;
  buyerId?: string;
  sellerId?: string;
  purchasedResourceId?: string;
  purchasedOfferVersion?: number;
  marketGroupId?: string;
  buyerGrantedActionsMask?: number;
  buyerPaidPrice?: number;
  createTime?: string;
  updateTime?: string;
}

export type ListOrdersApiRequest = PageApiRequest;
export type ListOrdersApiResponse = PageR<MarketOrderApiResponse>;
