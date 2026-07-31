import type { MarketSearchHit } from '@/domains/Market';
import type { ResourceItem } from '@/domains/Resource';
import { resolveResourceIconType } from '@/domains/Resource';
import type { MarketResourceTableItem } from '../_components/MarketResourceTable/index.type';

function stripHighlightMarkup(text: string): string {
  return text.replace(/<\/?em\b[^>]*>/gi, '');
}

function hitLowestPrice(hit: MarketSearchHit): number {
  const tiers = hit.marketSaleInfo?.marketSaleTiers ?? [];
  if (tiers.length === 0) return 0;
  return Math.min(...tiers.map((tier) => tier.price));
}

function resourcePrice(resource: ResourceItem, groupId: string): number {
  const sale = resource.marketSaleInfos?.[groupId];
  const tiers = sale?.marketSaleTiers ?? [];
  if (tiers.length === 0) return 0;
  return Math.min(...tiers.map((tier) => tier.price));
}

export function marketHitToTableItem(hit: MarketSearchHit): MarketResourceTableItem {
  return {
    id: hit.resourceId,
    name: stripHighlightMarkup(hit.resourceName),
    resourceType: hit.resourceType,
    resourceIconType: resolveResourceIconType(hit.resourceType),
    ownerLabel: '—',
    price: hitLowestPrice(hit),
  };
}

export function marketResourceToTableItem(
  resource: ResourceItem,
  groupId: string
): MarketResourceTableItem {
  return {
    id: resource.resourceId,
    name: resource.resourceName,
    resourceType: resource.resourceType,
    resourceIconType: resource.resourceIconType ?? resolveResourceIconType(resource.resourceType),
    ownerLabel: resource.ownerInfo.nickname || resource.ownerInfo.realName || '—',
    price: resourcePrice(resource, groupId),
  };
}
