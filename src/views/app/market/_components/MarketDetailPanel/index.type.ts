import type { MarketResourceDetail } from '@/domains/Market';

export interface MarketDetailPanelProps {
  isOpen: boolean;
  detail: MarketResourceDetail;
  priceLabel: string;
  onOpenChange: (open: boolean) => void;
  onPurchase: () => void;
  onAddToCart: () => void;
  onToggleLike: () => void;
  onToggleFavorite: () => void;
  liked: boolean;
  favorited: boolean;
  labels: {
    title: string;
    preview: string;
    description: string;
    tags: string;
    purchase: string;
    addToCart: string;
    like: string;
    favorite: string;
    close: string;
    seller: string;
    onSale: string;
    authorIntro: string;
    comments: string;
    commentCount: string;
    noComments: string;
    updatedAt: string;
    offerHint: string;
  };
}
