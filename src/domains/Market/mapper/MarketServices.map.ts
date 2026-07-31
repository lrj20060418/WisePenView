import type { ResourceItem, ResourceMarketSaleInfo } from '@/domains/Resource';
import { normalizeSearchResourceType } from '@/domains/Resource';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import {
  normalizeFiniteNumber,
  normalizeNonNegativeNumber,
} from '@/utils/normalize/normalizeNumber';
import type {
  ListOrdersApiResponse,
  MarketOrderApiResponse,
  MarketSaleInfoApiResponse,
  MarketSaleTierApiResponse,
  MarketSearchHitItemApiResponse,
  OffShelfSaleInfoApiRequest,
  PublishSaleInfoApiRequest,
  PurchaseResourceApiRequest,
  SearchMarketResourcesApiRequest,
  SearchMarketResourcesApiResponse,
} from '../apis/MarketApi.type';
import type {
  MarketOrder,
  MarketResourceDetail,
  MarketSaleInfo,
  MarketSaleTier,
  MarketSearchHit,
} from '../entity/market';
import { MARKET_SALE_STATUS, MARKET_SEARCH_SCOPE, normalizeMarketSaleStatus } from '../enum';
import type {
  GetMarketResourceDetailRequest,
  ListOrdersResult,
  OffShelfSaleInfoRequest,
  PublishSaleInfoRequest,
  PurchaseResourceRequest,
  SearchMarketResourcesRequest,
  SearchMarketResourcesResult,
} from '../service/index.type';

const NOTE_LIKE = new Set(['note', 'drawio']);

export const isMarketNoteLikeType = (resourceType?: string): boolean =>
  NOTE_LIKE.has((resourceType ?? '').trim().toLowerCase());

const mapSaleTierFromApi = (raw: MarketSaleTierApiResponse): MarketSaleTier => ({
  offerId: raw.offerId ?? '',
  price: normalizeNonNegativeNumber(raw.price) ?? 0,
  grantedActionsMask:
    raw.grantedActionsMask == null
      ? undefined
      : (normalizeFiniteNumber(raw.grantedActionsMask) ?? undefined),
  createAt: raw.createAt ? formatTimestampToDateTime(raw.createAt) : undefined,
});

const mapSaleInfoFromApi = (
  raw: MarketSaleInfoApiResponse | null | undefined
): MarketSaleInfo | null => {
  if (raw == null) return null;
  return {
    reviewActionsMask:
      raw.reviewActionsMask == null
        ? undefined
        : (normalizeFiniteNumber(raw.reviewActionsMask) ?? undefined),
    reviewContentPercentage: normalizeNonNegativeNumber(raw.reviewContentPercentage) ?? 0,
    marketSaleTiers: (raw.marketSaleTiers ?? []).map(mapSaleTierFromApi),
    status: normalizeMarketSaleStatus(raw.status),
    offerVersion:
      raw.offerVersion == null ? undefined : (normalizeFiniteNumber(raw.offerVersion) ?? undefined),
    auditMessage: undefined,
  };
};

const mapSaleInfoFromResource = (raw: ResourceMarketSaleInfo | undefined): MarketSaleInfo => {
  if (raw == null) {
    return {
      reviewContentPercentage: 0,
      marketSaleTiers: [],
      status: MARKET_SALE_STATUS.PENDING_REVIEW,
    };
  }
  return {
    reviewContentPercentage: raw.reviewContentPercentage ?? 0,
    marketSaleTiers: (raw.marketSaleTiers ?? []).map((tier) => ({
      offerId: tier.offerId,
      price: tier.price,
    })),
    status: normalizeMarketSaleStatus(raw.status),
    offerVersion: raw.offerVersion,
    auditMessage: raw.auditMessage,
  };
};

const mapSearchHitFromApi = (raw: MarketSearchHitItemApiResponse): MarketSearchHit => ({
  resourceId: normalizeId(raw.resourceId),
  marketGroupId: normalizeId(raw.marketGroupId),
  resourceType: normalizeSearchResourceType(raw.resourceType ?? ''),
  resourceName: raw.resourceName ?? '',
  ownerId: normalizeId(raw.ownerId),
  marketSaleInfo: mapSaleInfoFromApi(raw.marketSaleInfo),
  highlightContent: raw.highlightContent ?? null,
  updateTime: raw.updateTime ? formatTimestampToDateTime(raw.updateTime) : '',
});

const mapSearchMarketResourcesRequest = (
  params: SearchMarketResourcesRequest
): SearchMarketResourcesApiRequest => {
  const scope =
    params.scope in MARKET_SEARCH_SCOPE.configs ? params.scope : MARKET_SEARCH_SCOPE.ALL;
  return {
    ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
    ...(params.marketGroupId ? { marketGroupId: params.marketGroupId } : {}),
    scope,
    page: params.page,
    size: params.size,
  };
};

const mapSearchMarketResourcesFromApi = (
  data: SearchMarketResourcesApiResponse
): SearchMarketResourcesResult => ({
  list: (data.list ?? []).map(mapSearchHitFromApi),
  total: data.total ?? 0,
  page: data.page ?? 1,
  size: data.size ?? 20,
  totalPage: data.totalPage ?? 0,
});

const pickSaleForGroup = (
  resource: ResourceItem,
  marketGroupId: string
): ResourceMarketSaleInfo | undefined => {
  const infos = resource.marketSaleInfos ?? {};
  if (marketGroupId && infos[marketGroupId]) return infos[marketGroupId];
  const first = Object.values(infos)[0];
  return first;
};

const mapResourceDetailFromResourceItem = (
  params: GetMarketResourceDetailRequest,
  resource: ResourceItem,
  extras: { title?: string; updateTime?: string; authors?: string[] } = {}
): MarketResourceDetail => {
  const saleRaw = pickSaleForGroup(resource, params.marketGroupId ?? '');
  const tags = Object.values(resource.currentTags ?? {}).filter(Boolean);
  const owner = resource.ownerInfo ?? {};
  return {
    resourceId: normalizeId(resource.resourceId),
    marketGroupId: params.marketGroupId ?? '',
    resourceName: extras.title || resource.resourceName || '',
    resourceType: normalizeSearchResourceType(resource.resourceType ?? params.resourceType ?? ''),
    ownerId: normalizeId(resource.ownerId ?? params.resourceId),
    ownerInfo: {
      nickname: owner.nickname ?? owner.realName ?? '',
      realName: owner.realName,
      avatar: owner.avatar,
    },
    preview: resource.preview,
    description: resource.preview,
    tags,
    likes: resource.likeCount ?? 0,
    favorites: resource.favoriteCount ?? 0,
    comments: resource.commentCount ?? 0,
    marketSaleInfo: mapSaleInfoFromResource(saleRaw),
    updateTime: extras.updateTime,
    authors: extras.authors ?? [],
  };
};

const DEFAULT_GRANTED_ACTIONS = ['VIEW', 'DOWNLOAD_WATERMARK'] as const;
const DEFAULT_REVIEW_ACTIONS = ['VIEW'] as const;

const mapPublishSaleInfoRequest = (params: PublishSaleInfoRequest): PublishSaleInfoApiRequest => ({
  resourceId: params.resourceId,
  marketGroupId: params.marketGroupId,
  tagIds: params.tagIds,
  reviewContentPercentage: params.reviewContentPercentage ?? 20,
  reviewActions: (params.reviewActions ?? [
    ...DEFAULT_REVIEW_ACTIONS,
  ]) as PublishSaleInfoApiRequest['reviewActions'],
  marketSaleTiers: [
    {
      price: Math.max(0, Math.floor(params.price)),
      grantedActions: (params.grantedActions ?? [
        ...DEFAULT_GRANTED_ACTIONS,
      ]) as PublishSaleInfoApiRequest['marketSaleTiers'][number]['grantedActions'],
    },
  ],
  offerVersion: params.offerVersion ?? 1,
});

const mapOffShelfSaleInfoRequest = (
  params: OffShelfSaleInfoRequest
): OffShelfSaleInfoApiRequest => ({
  resourceId: params.resourceId,
  marketGroupId: params.marketGroupId,
});

const mapPurchaseResourceRequest = (
  params: PurchaseResourceRequest
): PurchaseResourceApiRequest => ({
  offerId: params.offerId,
  resourceId: params.resourceId,
  marketGroupId: params.marketGroupId,
});

const mapOrderFromApi = (raw: MarketOrderApiResponse): MarketOrder => ({
  orderId: normalizeId(raw.orderId),
  resourceId: normalizeId(raw.purchasedResourceId),
  marketGroupId: normalizeId(raw.marketGroupId),
  offerVersion:
    raw.purchasedOfferVersion == null
      ? undefined
      : (normalizeFiniteNumber(raw.purchasedOfferVersion) ?? undefined),
  paidPrice: normalizeNonNegativeNumber(raw.buyerPaidPrice) ?? 0,
  sellerId: raw.sellerId == null ? undefined : normalizeId(raw.sellerId),
  createTime: raw.createTime ? formatTimestampToDateTime(raw.createTime) : '',
});

const mapListOrdersFromApi = (data: ListOrdersApiResponse): ListOrdersResult => ({
  list: (data.list ?? []).map(mapOrderFromApi),
  total: data.total ?? 0,
  page: data.page ?? 1,
  size: data.size ?? 20,
  totalPage: data.totalPage ?? 0,
});

export const MarketServicesMap = {
  mapSearchMarketResourcesRequest,
  mapSearchMarketResourcesFromApi,
  mapResourceDetailFromResourceItem,
  mapPublishSaleInfoRequest,
  mapOffShelfSaleInfoRequest,
  mapPurchaseResourceRequest,
  mapOrderFromApi,
  mapListOrdersFromApi,
  mapSaleInfoFromResource,
  isMarketNoteLikeType,
};
