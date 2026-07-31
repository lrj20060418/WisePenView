import type { MarketCartItem } from '../mockData';

const CART_STORAGE_KEY = 'wisepen.market.cart.v1';

function isCartItem(value: unknown): value is MarketCartItem {
  if (value == null || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.resourceId === 'string' &&
    typeof item.marketGroupId === 'string' &&
    typeof item.offerId === 'string' &&
    typeof item.resourceName === 'string' &&
    typeof item.price === 'number' &&
    typeof item.selected === 'boolean'
  );
}

export function loadMarketCartFromSession(): MarketCartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
}

export function saveMarketCartToSession(items: MarketCartItem[]): void {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}
