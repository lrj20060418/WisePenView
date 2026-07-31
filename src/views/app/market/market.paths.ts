/** 资料集市路由路径常量 */

export interface MarketItemQuery {
  groupId?: string;
  offerVersion?: number;
  type?: string;
}

function buildItemPath(resourceId: string, query?: MarketItemQuery): string {
  const base = `/app/market/item/${resourceId}`;
  if (!query) return base;
  const params = new URLSearchParams();
  if (query.groupId) params.set('groupId', query.groupId);
  if (query.offerVersion != null) params.set('offerVersion', String(query.offerVersion));
  if (query.type) params.set('type', query.type);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export const MARKET_PATH = {
  root: '/app/market',
  mine: '/app/market/mine',
  cart: '/app/market/cart',
  publish: '/app/market/publish',
  edit: (listingId: string) => `/app/market/publish/${listingId}`,
  manage: '/app/market/manage',
  item: buildItemPath,
  group: (groupId: string) => `/app/market/group/${groupId}`,
  folder: (groupId: string, folderId: string) => `/app/market/group/${groupId}/folder/${folderId}`,
} as const;
