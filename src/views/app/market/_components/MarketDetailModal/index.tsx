/**
 * 集市资料详情弹层：在浏览页上方打开，不切换底层路由。
 */
import { EmptyState } from '@/components/Feedback';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { useInteractService, useMarketService, useWalletService } from '@/domains';
import type { MarketResourceDetail } from '@/domains/Market';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMarketSession } from '../../_context/useMarketSession';
import { useMarketPriceLabel } from '../../_hooks/useMarketPriceLabel';
import { MARKET_PATH } from '../../market.paths';
import MarketDetailPanel from '../MarketDetailPanel';
import MarketPurchaseDialog from '../MarketPurchaseDialog';
import type { MarketDetailModalProps } from './index.type';
import styles from './style.module.less';

function detailLowestTier(detail: MarketResourceDetail): { price: number; offerId: string } {
  const tiers = detail.marketSaleInfo.marketSaleTiers ?? [];
  if (tiers.length === 0) return { price: 0, offerId: '' };
  const cheapest = tiers.reduce((best, tier) => (tier.price < best.price ? tier : best), tiers[0]);
  return { price: cheapest.price, offerId: cheapest.offerId };
}

function MarketDetailModal({ target, onClose }: MarketDetailModalProps) {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const priceLabel = useMarketPriceLabel();
  const { addDetailToCart } = useMarketSession();
  const marketService = useMarketService();
  const walletService = useWalletService();
  const interactService = useInteractService();
  const isOpen = Boolean(target?.resourceId);
  const resourceId = target?.resourceId ?? '';

  const {
    data: detail,
    loading,
    error,
    refresh,
  } = useRequest(
    () =>
      marketService.getResourceDetail({
        resourceId,
        marketGroupId: target?.marketGroupId,
        offerVersion: target?.offerVersion,
        resourceType: target?.resourceType,
      }),
    {
      ready: isOpen,
      refreshDeps: [
        resourceId,
        target?.marketGroupId,
        target?.offerVersion,
        target?.resourceType,
        marketService,
      ],
    }
  );

  const { data: wallet } = useRequest(() => walletService.getUserWalletInfo(), {
    ready: isOpen,
    onError: () => undefined,
  });

  const { data: interaction, mutate: mutateInteraction } = useRequest(
    () => interactService.getResourceInteraction(resourceId),
    {
      ready: isOpen,
      refreshDeps: [resourceId, interactService],
      onError: () => undefined,
    }
  );

  const { data: favoriteCollectionIds, mutate: mutateFavoriteIds } = useRequest(
    () => interactService.getFavoriteCollectionIds(resourceId),
    {
      ready: isOpen,
      refreshDeps: [resourceId, interactService],
      onError: () => undefined,
    }
  );

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const liked = Boolean(interaction?.liked);
  const favorited = Boolean(favoriteCollectionIds?.length);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!isOpen) return null;

  if (loading || error || !detail) {
    return (
      <AppDisplayDialog
        isOpen
        onOpenChange={handleOpenChange}
        title={t('page.detail.title')}
        size="cover"
        closeText={false}
        containerClassName={styles.container}
        dialogClassName={styles.dialog}
        bodyClassName={styles.statusBody}
        footer={false}
      >
        {loading ? (
          <p className={styles.statusText}>{t('page.tabStatus.loading')}</p>
        ) : (
          <div className={styles.statusBlock}>
            <EmptyState
              title={t('page.detail.notFoundTitle')}
              description={error ? parseErrorMessage(error) : t('page.detail.notFoundHint')}
            />
            {error ? (
              <Button variant="primary" onPress={refresh}>
                {t('page.tabStatus.retry')}
              </Button>
            ) : null}
          </div>
        )}
      </AppDisplayDialog>
    );
  }

  const { price, offerId } = detailLowestTier(detail);
  const balance = wallet?.balance ?? 0;

  const handlePurchase = async () => {
    if (!detail.marketGroupId) {
      toast.danger(t('page.purchase.needGroup'));
      return;
    }
    if (!offerId) {
      toast.danger(t('page.purchase.needOffer'));
      return;
    }
    setPurchasing(true);
    try {
      await marketService.purchaseResource({
        resourceId: detail.resourceId,
        marketGroupId: detail.marketGroupId,
        offerId,
      });
      setPurchaseOpen(false);
      toast.success(t('page.purchase.success'));
      onClose();
      navigate(MARKET_PATH.mine);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <MarketDetailPanel
        isOpen
        detail={detail}
        priceLabel={priceLabel(price)}
        liked={liked}
        favorited={favorited}
        labels={{
          title: t('page.detail.title'),
          preview: t('page.detail.preview'),
          description: t('page.detail.description'),
          tags: t('page.detail.tags'),
          purchase: t('page.detail.purchase'),
          addToCart: t('page.detail.addToCart'),
          like: t('page.detail.like'),
          favorite: t('page.detail.favorite'),
          close: t('page.detail.close'),
          seller: t('page.detail.seller'),
          onSale: t('page.onSale'),
          authorIntro: t('page.detail.authorIntro'),
          comments: t('page.detail.comments'),
          commentCount: t('page.detail.commentCount', { count: detail.comments }),
          noComments: t('page.detail.noComments'),
          updatedAt: t('page.detail.updatedAt'),
          offerHint: t('page.detail.offerHint', { price }),
        }}
        onOpenChange={handleOpenChange}
        onPurchase={() => setPurchaseOpen(true)}
        onAddToCart={() => addDetailToCart(detail)}
        onToggleLike={() => {
          void (async () => {
            try {
              await interactService.toggleResourceLike(detail.resourceId);
              mutateInteraction(
                interaction
                  ? { ...interaction, liked: !interaction.liked }
                  : { liked: !liked, score: 0, likedCommentIds: new Set() }
              );
              toast.success(liked ? t('page.detail.unliked') : t('page.detail.liked'));
            } catch (err) {
              toast.danger(parseErrorMessage(err));
            }
          })();
        }}
        onToggleFavorite={() => {
          void (async () => {
            try {
              if (favorited) {
                await interactService.updateFavoriteCollections({
                  resourceId: detail.resourceId,
                  collectionIds: [],
                });
                mutateFavoriteIds([]);
                toast.success(t('page.detail.unfavorited'));
                return;
              }
              const collections = await interactService.listFavoriteCollections();
              const defaultId =
                collections.find((item) => item.isDefault)?.collectionId ??
                collections[0]?.collectionId;
              if (!defaultId) {
                toast.danger(t('page.detail.favoriteFailed'));
                return;
              }
              await interactService.updateFavoriteCollections({
                resourceId: detail.resourceId,
                collectionIds: [defaultId],
              });
              mutateFavoriteIds([defaultId]);
              toast.success(t('page.detail.favorited'));
            } catch (err) {
              toast.danger(parseErrorMessage(err));
            }
          })();
        }}
      />

      <MarketPurchaseDialog
        isOpen={purchaseOpen}
        resourceName={detail.resourceName}
        priceLabel={priceLabel(price)}
        balanceLabel={t('page.purchase.balanceValue', { balance })}
        labels={{
          title: t('page.purchase.title'),
          resource: t('page.purchase.resource'),
          price: t('page.purchase.price'),
          balance: t('page.purchase.balance'),
          hint: t('page.purchase.hint'),
          cancel: t('page.purchase.cancel'),
          confirm: purchasing ? t('page.purchase.confirming') : t('page.purchase.confirm'),
        }}
        onOpenChange={(open) => {
          if (!purchasing) setPurchaseOpen(open);
        }}
        onConfirm={() => {
          void handlePurchase();
        }}
      />
    </>
  );
}

export default MarketDetailModal;
