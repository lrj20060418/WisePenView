import type { FavoriteItem } from '@/domains/Interact';
import {
  MarketServicesMap,
  type MarketManagedListing,
  type MarketOrder,
  type MarketSaleStatus,
} from '@/domains/Market';
import {
  normalizeSearchResourceType,
  type ResourceItem,
  type SearchResourceType,
} from '@/domains/Resource';
import type { MarketListing, MarketPublishDraft, MarketResourceType } from '../mockData';
import { marketCoverForId } from './marketCover';

export function managedListingKey(
  row: Pick<MarketManagedListing, 'resourceId' | 'marketGroupId'>
): string {
  return `${row.resourceId}__${row.marketGroupId}`;
}

/** 解析管理列表编辑路由 id：`resourceId__marketGroupId` */
export function parseManagedListingKey(
  key: string
): { resourceId: string; marketGroupId: string } | null {
  const sep = key.indexOf('__');
  if (sep <= 0 || sep >= key.length - 2) return null;
  return {
    resourceId: key.slice(0, sep),
    marketGroupId: key.slice(sep + 2),
  };
}

export function flattenManagedListings(resources: ResourceItem[]): MarketManagedListing[] {
  const rows: MarketManagedListing[] = [];
  for (const resource of resources) {
    const infos = resource.marketSaleInfos ?? {};
    for (const [marketGroupId, sale] of Object.entries(infos)) {
      const bind = (resource.tagBinds ?? []).find((item) => item.groupId === marketGroupId);
      const tagIds = bind?.tags
        ? Object.keys(bind.tags).filter(Boolean)
        : Object.keys(resource.currentTags ?? {});
      rows.push({
        resourceId: resource.resourceId,
        marketGroupId,
        resourceName: resource.resourceName,
        resourceType: normalizeSearchResourceType(resource.resourceType ?? ''),
        preview: resource.preview,
        tagIds,
        marketSaleInfo: MarketServicesMap.mapSaleInfoFromResource(sale),
        coverImageUrl: marketCoverForId(resource.resourceId),
        updateTime: undefined,
      });
    }
  }
  return rows;
}

export function managedListingPrice(row: MarketManagedListing): number {
  return row.marketSaleInfo.marketSaleTiers[0]?.price ?? 0;
}

export function countManagedBySaleStatus(
  listings: MarketManagedListing[]
): Record<MarketSaleStatus, number> {
  const counts: Record<MarketSaleStatus, number> = {
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    BANNED: 0,
    OFF_SHELF: 0,
  };
  listings.forEach((item) => {
    counts[item.marketSaleInfo.status] += 1;
  });
  return counts;
}

export function toMarketResourceType(type: SearchResourceType | string): MarketResourceType {
  const lower = String(type).trim().toLowerCase();
  if (lower === 'note' || lower === 'drawio') return 'NOTE';
  if (lower === 'skill') return 'SKILL';
  if (lower === 'agent') return 'AGENT';
  return 'DOCUMENT';
}

export function managedToMarketListing(row: MarketManagedListing): MarketListing {
  return {
    id: managedListingKey(row),
    resourceId: row.resourceId,
    marketGroupId: row.marketGroupId,
    resourceName: row.resourceName,
    resourceType: toMarketResourceType(row.resourceType),
    ownerId: '',
    ownerInfo: { nickname: '' },
    updateTime: row.updateTime ?? '',
    preview: row.preview,
    description: row.preview,
    coverImageUrl: row.coverImageUrl ?? marketCoverForId(row.resourceId),
    coverTone: 'slate',
    coverTitle: row.resourceName,
    likes: 0,
    favorites: 0,
    comments: 0,
    marketSaleInfo: {
      status: row.marketSaleInfo.status,
      offerVersion: row.marketSaleInfo.offerVersion ?? 1,
      reviewContentPercentage: row.marketSaleInfo.reviewContentPercentage,
      marketSaleTiers: row.marketSaleInfo.marketSaleTiers.map((tier) => ({
        offerId: tier.offerId,
        price: tier.price,
        grantedActions: [],
      })),
      auditMessage: row.marketSaleInfo.auditMessage,
    },
    folderId: row.tagIds[0] ?? '',
  };
}

export function managedToPublishDraft(row: MarketManagedListing): MarketPublishDraft {
  return {
    title: row.resourceName,
    description: row.preview ?? '',
    price: String(managedListingPrice(row)),
    tags: [],
    resourceFile: null,
    resourceDriveRef: {
      resourceId: row.resourceId,
      resourceName: row.resourceName,
      resourceType: row.resourceType,
    },
    coverFile: null,
    coverImageUrl: row.coverImageUrl ?? null,
    editingListingId: managedListingKey(row),
    marketGroupId: row.marketGroupId,
    folderTagId: row.tagIds[0] ?? '',
    offerVersion: row.marketSaleInfo.offerVersion ?? 1,
  };
}

export function favoriteToMarketListing(item: FavoriteItem): MarketListing | null {
  const info = item.resourceInfo;
  if (!info) return null;
  const saleEntries = Object.entries(info.marketSaleInfos ?? {});
  const [marketGroupId, sale] = saleEntries[0] ?? ['', undefined];
  const mappedSale = MarketServicesMap.mapSaleInfoFromResource(sale);
  return {
    id: item.resourceId,
    resourceId: item.resourceId,
    marketGroupId,
    resourceName: info.resourceName,
    resourceType: toMarketResourceType(info.resourceType ?? ''),
    ownerId: info.ownerId ?? '',
    ownerInfo: {
      nickname: info.ownerInfo?.nickname ?? info.ownerInfo?.realName ?? '',
    },
    updateTime: '',
    preview: info.preview,
    description: info.preview,
    coverImageUrl: marketCoverForId(item.resourceId),
    coverTone: 'slate',
    coverTitle: info.resourceName,
    likes: info.likeCount ?? 0,
    favorites: info.favoriteCount ?? 0,
    comments: info.commentCount ?? 0,
    marketSaleInfo: {
      status: mappedSale.status,
      offerVersion: mappedSale.offerVersion ?? 1,
      reviewContentPercentage: mappedSale.reviewContentPercentage,
      marketSaleTiers: mappedSale.marketSaleTiers.map((tier) => ({
        offerId: tier.offerId,
        price: tier.price,
        grantedActions: [],
      })),
      auditMessage: mappedSale.auditMessage,
    },
    folderId: '',
  };
}

export function orderToMarketListing(order: MarketOrder, untitledLabel: string): MarketListing {
  const title = order.resourceName?.trim() || untitledLabel;
  return {
    id: order.orderId,
    resourceId: order.resourceId,
    marketGroupId: order.marketGroupId,
    resourceName: title,
    resourceType: 'DOCUMENT',
    ownerId: order.sellerId ?? '',
    ownerInfo: { nickname: '' },
    updateTime: order.createTime,
    coverImageUrl: marketCoverForId(order.resourceId),
    coverTone: 'amber',
    coverTitle: title,
    description: order.createTime,
    likes: 0,
    favorites: 0,
    comments: 0,
    marketSaleInfo: {
      status: 'PUBLISHED',
      offerVersion: order.offerVersion ?? 1,
      reviewContentPercentage: 0,
      marketSaleTiers: [{ offerId: order.orderId, price: order.paidPrice, grantedActions: [] }],
    },
    folderId: '',
  };
}
