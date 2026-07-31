import type { SearchResourceType } from '@/domains/Resource';
import type { MarketSaleStatus } from '../enum';

/** 售卖档位（对齐 MarketSaleTierBase） */
export interface MarketSaleTier {
  offerId: string;
  price: number;
  grantedActionsMask?: number;
  createAt?: string;
}

/** 售卖快照（对齐 MarketSaleInfoBase） */
export interface MarketSaleInfo {
  reviewActionsMask?: number;
  reviewContentPercentage: number;
  marketSaleTiers: MarketSaleTier[];
  status: MarketSaleStatus;
  offerVersion?: number;
  auditMessage?: string;
}

/**
 * 集市搜索命中项（对齐 MarketSearchHitItemResponse）。
 * 不含详情侧学院/评论/封面等字段。
 */
export interface MarketSearchHit {
  resourceId: string;
  marketGroupId: string;
  resourceType: SearchResourceType;
  resourceName: string;
  ownerId: string;
  marketSaleInfo: MarketSaleInfo | null;
  highlightContent: string | null;
  updateTime: string;
}

/** 集市详情侧作者展示 */
export interface MarketDetailOwnerInfo {
  nickname: string;
  realName?: string;
  avatar?: string;
  college?: string;
  bio?: string;
}

/** 买家订单（对齐 MarketOrderResponse） */
export interface MarketOrder {
  orderId: string;
  resourceId: string;
  marketGroupId: string;
  offerVersion?: number;
  paidPrice: number;
  sellerId?: string;
  createTime: string;
  /** 展示用；后端订单体可能不含，由 mock 或上层补全 */
  resourceName?: string;
}

/** 管理列表行：我发布在某集市组下的售卖快照 */
export interface MarketManagedListing {
  resourceId: string;
  marketGroupId: string;
  resourceName: string;
  resourceType: SearchResourceType;
  preview?: string;
  /** 该集市组下已绑定的标签，重提/编辑时回填 publishSaleInfo.tagIds */
  tagIds: string[];
  marketSaleInfo: MarketSaleInfo;
  coverImageUrl?: string;
  updateTime?: string;
}

/**
 * 集市资源详情（由 Note/Document getInfo + marketSaleInfos 组装）。
 * 与 MarketSearchHit 分离：详情含作者/预览/互动等。
 */
export interface MarketResourceDetail {
  resourceId: string;
  marketGroupId: string;
  resourceName: string;
  resourceType: SearchResourceType;
  ownerId: string;
  ownerInfo: MarketDetailOwnerInfo;
  preview?: string;
  description?: string;
  coverImageUrl?: string;
  tags: string[];
  likes: number;
  favorites: number;
  comments: number;
  marketSaleInfo: MarketSaleInfo;
  updateTime?: string;
  authors: string[];
}
