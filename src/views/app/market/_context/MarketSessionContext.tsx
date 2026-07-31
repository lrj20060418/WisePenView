import type { MarketResourceDetail } from '@/domains/Market';
import { toast } from '@heroui/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { loadMarketCartFromSession, saveMarketCartToSession } from '../_utils/marketCartStorage';
import { marketCoverForId } from '../_utils/marketCover';
import {
  createEmptyPublishDraft,
  type MarketCartItem,
  type MarketListing,
  type MarketPublishDraft,
} from '../mockData';
import { MarketSessionContext, type MarketSessionContextValue } from './marketSessionShared';

function lowestPrice(tiers: { price: number; offerId?: string }[]): {
  price: number;
  offerId: string;
} {
  if (tiers.length === 0) return { price: 0, offerId: '' };
  const cheapest = tiers.reduce((best, tier) => (tier.price < best.price ? tier : best), tiers[0]);
  return { price: cheapest.price, offerId: cheapest.offerId ?? '' };
}

export function MarketSessionProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('market');
  const [cartItems, setCartItems] = useState<MarketCartItem[]>(() => loadMarketCartFromSession());
  const [publishDraft, setPublishDraft] = useState<MarketPublishDraft>(createEmptyPublishDraft());

  /**
   * @wisepen-manual-effect
   * 执行时机：购物车内容变化后写入 sessionStorage。
   * 不可替代原因：需要将 React 状态持久化到浏览器会话存储，属于外部副作用。
   * cleanup：同步写盘，无需清理。
   */
  useEffect(() => {
    saveMarketCartToSession(cartItems);
  }, [cartItems]);

  const value: MarketSessionContextValue = {
    cartItems,
    publishDraft,
    setPublishDraft,
    addToCart: (listing: MarketListing) => {
      const tier = listing.marketSaleInfo.marketSaleTiers[0];
      setCartItems((prev) => {
        if (prev.some((item) => item.listingId === listing.id)) return prev;
        return [
          ...prev,
          {
            id: `cart-${listing.id}`,
            listingId: listing.id,
            resourceId: listing.resourceId,
            marketGroupId: listing.marketGroupId,
            offerId: tier?.offerId ?? '',
            resourceName: listing.resourceName,
            ownerName: listing.ownerInfo.nickname,
            college: listing.ownerInfo.college ?? '',
            price: tier?.price ?? 0,
            coverTone: listing.coverTone,
            coverImageUrl: listing.coverImageUrl || marketCoverForId(listing.resourceId),
            selected: true,
          },
        ];
      });
      toast.success(t('page.detail.addedToCart'));
    },
    addDetailToCart: (detail: MarketResourceDetail) => {
      const { price, offerId } = lowestPrice(detail.marketSaleInfo.marketSaleTiers);
      setCartItems((prev) => {
        if (prev.some((item) => item.listingId === detail.resourceId)) return prev;
        return [
          ...prev,
          {
            id: `cart-${detail.resourceId}`,
            listingId: detail.resourceId,
            resourceId: detail.resourceId,
            marketGroupId: detail.marketGroupId,
            offerId,
            resourceName: detail.resourceName,
            ownerName: detail.ownerInfo.nickname || detail.ownerInfo.realName || '',
            college: detail.ownerInfo.college ?? '',
            price,
            coverTone: 'slate',
            coverImageUrl: detail.coverImageUrl || marketCoverForId(detail.resourceId),
            selected: true,
          },
        ];
      });
      toast.success(t('page.detail.addedToCart'));
    },
    toggleCartItem: (id) => {
      setCartItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
      );
    },
    toggleCartAll: (selected) => {
      setCartItems((prev) => prev.map((item) => ({ ...item, selected })));
    },
    removeCartItem: (id) => {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    },
  };

  return <MarketSessionContext.Provider value={value}>{children}</MarketSessionContext.Provider>;
}
