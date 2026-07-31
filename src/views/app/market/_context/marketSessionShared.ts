import type { MarketResourceDetail } from '@/domains/Market';
import { createContext } from 'react';
import type { MarketCartItem, MarketListing, MarketPublishDraft } from '../mockData';

export interface MarketSessionContextValue {
  cartItems: MarketCartItem[];
  publishDraft: MarketPublishDraft;
  setPublishDraft: (draft: MarketPublishDraft) => void;
  addToCart: (listing: MarketListing) => void;
  addDetailToCart: (detail: MarketResourceDetail) => void;
  toggleCartItem: (id: string) => void;
  toggleCartAll: (selected: boolean) => void;
  removeCartItem: (id: string) => void;
}

export const MarketSessionContext = createContext<MarketSessionContextValue | null>(null);
