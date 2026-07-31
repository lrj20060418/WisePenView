/**
 * 资料集市视图模型与轻量工具（无运行时假数据）。
 */

/** 对齐 ResourceType（前端浏览范围） */
export type MarketResourceType = 'NOTE' | 'DOCUMENT' | 'SKILL' | 'AGENT';

export type MarketSearchScope = 'ALL' | 'DOCUMENT' | 'NOTE';

export type MarketSaleFilter = 'ALL' | 'ON_SALE' | 'OFF_SHELF';

export type MarketMyTab = 'published' | 'likes' | 'favorites' | 'purchased';

export type MarketListStatus = 'content' | 'empty' | 'loading' | 'error';

/** 对齐 MarketSaleStatus */
export type MarketSaleStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'BANNED' | 'OFF_SHELF';

/** 对齐 MarketSaleTierResponse */
export interface MarketSaleTier {
  offerId: string;
  price: number;
  grantedActions: string[];
}

/** 对齐 MarketSaleInfoResponse（详情侧） */
export interface MarketSaleInfo {
  status: MarketSaleStatus;
  offerVersion: number;
  reviewContentPercentage: number;
  marketSaleTiers: MarketSaleTier[];
  auditMessage?: string;
  auditAt?: string;
}

/** 对齐 UserDisplayBase + 学院展示补充 */
export interface MarketOwnerInfo {
  nickname: string;
  realName?: string;
  avatar?: string;
  college?: string;
  bio?: string;
}

/**
 * 浏览卡片 / 我的集市网格用视图模型。
 */
export interface MarketListing {
  id: string;
  resourceId: string;
  marketGroupId: string;
  resourceName: string;
  resourceType: MarketResourceType;
  ownerId: string;
  ownerInfo: MarketOwnerInfo;
  updateTime: string;
  highlightContent?: string;
  preview?: string;
  coverImageUrl: string;
  coverTone: 'blue' | 'teal' | 'slate' | 'amber';
  coverTitle: string;
  description?: string;
  tags?: string[];
  likes: number;
  favorites: number;
  comments: number;
  marketSaleInfo: MarketSaleInfo;
  folderId: string;
}

export interface MarketCartItem {
  id: string;
  listingId: string;
  resourceId: string;
  marketGroupId: string;
  offerId: string;
  resourceName: string;
  ownerName: string;
  college: string;
  price: number;
  coverTone: MarketListing['coverTone'];
  coverImageUrl: string;
  selected: boolean;
}

export interface MarketDriveResourceRef {
  resourceId: string;
  resourceName: string;
  resourceType: string;
}

export interface MarketPublishDraft {
  title: string;
  description: string;
  price: string;
  tags: string[];
  resourceFile: File | null;
  resourceDriveRef: MarketDriveResourceRef | null;
  coverFile: File | null;
  coverImageUrl: string | null;
  editingListingId: string | null;
  marketGroupId: string;
  folderTagId: string;
  offerVersion: number;
}

export function createEmptyPublishDraft(): MarketPublishDraft {
  return {
    title: '',
    description: '',
    price: '',
    tags: [],
    resourceFile: null,
    resourceDriveRef: null,
    coverFile: null,
    coverImageUrl: null,
    editingListingId: null,
    marketGroupId: '',
    folderTagId: '',
    offerVersion: 1,
  };
}

export function listingPrice(listing: MarketListing): number {
  return listing.marketSaleInfo.marketSaleTiers[0]?.price ?? 0;
}

export function listingOnSale(listing: MarketListing): boolean {
  return listing.marketSaleInfo.status === 'PUBLISHED';
}
