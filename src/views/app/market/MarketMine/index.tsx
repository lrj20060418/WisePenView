/**
 * 资料集市 · 我的集市（发布 / 收藏 / 已购；点赞 Tab 暂隐藏）。
 */
import SegmentedTabs from '@/components/SegmentedTabs';
import {
  useInteractService,
  useMarketService,
  useResourceService,
  useUserService,
} from '@/domains';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MarketDetailModal from '../_components/MarketDetailModal';
import type { MarketDetailTarget } from '../_components/MarketDetailModal/index.type';
import MarketListingGrid from '../_components/MarketListingGrid';
import MarketTabStatus from '../_components/MarketTabStatus';
import { useMarketPriceLabel } from '../_hooks/useMarketPriceLabel';
import {
  favoriteToMarketListing,
  flattenManagedListings,
  managedToMarketListing,
  orderToMarketListing,
} from '../_utils/managedListing';
import { MARKET_PATH } from '../market.paths';
import type { MarketListStatus, MarketMyTab } from '../mockData';
import page from './style.module.less';

const PAGE_SIZE = 50;

type MineTab = Exclude<MarketMyTab, 'likes'>;

function MarketMine() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const priceLabel = useMarketPriceLabel();
  const userService = useUserService();
  const [detailTarget, setDetailTarget] = useState<MarketDetailTarget | null>(null);
  const resourceService = useResourceService();
  const marketService = useMarketService();
  const interactService = useInteractService();
  const [myTab, setMyTab] = useState<MineTab>('published');

  const { data: profile } = useRequest(() => userService.getFullUserInfo(), {
    onError: () => undefined,
  });

  const {
    data: published = [],
    loading: loadingPublished,
    error: errorPublished,
    refresh: refreshPublished,
  } = useRequest(
    async () => {
      const pageResult = await resourceService.getUserResources({
        page: 1,
        size: PAGE_SIZE,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
      });
      return flattenManagedListings(pageResult.list).map(managedToMarketListing);
    },
    { onError: () => undefined }
  );

  const {
    data: favorites = [],
    loading: loadingFavorites,
    error: errorFavorites,
    refresh: refreshFavorites,
  } = useRequest(
    async () => {
      const pageResult = await interactService.listFavoritedResources({
        page: 1,
        size: PAGE_SIZE,
      });
      return pageResult.list
        .map(favoriteToMarketListing)
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    },
    { onError: () => undefined }
  );

  const {
    data: purchased = [],
    loading: loadingPurchased,
    error: errorPurchased,
    refresh: refreshPurchased,
  } = useRequest(
    async () => {
      const pageResult = await marketService.listOrders({ page: 1, size: PAGE_SIZE });
      return pageResult.list.map((order) => orderToMarketListing(order, t('page.orderUntitled')));
    },
    { onError: () => undefined }
  );

  const myTabListings =
    myTab === 'published' ? published : myTab === 'favorites' ? favorites : purchased;

  const loading =
    myTab === 'published'
      ? loadingPublished
      : myTab === 'favorites'
        ? loadingFavorites
        : loadingPurchased;

  const error =
    myTab === 'published'
      ? errorPublished
      : myTab === 'favorites'
        ? errorFavorites
        : errorPurchased;

  const tabStatus: MarketListStatus = loading
    ? 'loading'
    : error
      ? 'error'
      : myTabListings.length === 0
        ? 'empty'
        : 'content';

  const emptyCopy =
    myTab === 'favorites'
      ? {
          title: t('page.tabStatus.emptyFavoritesTitle'),
          hint: t('page.tabStatus.emptyFavoritesHint'),
        }
      : myTab === 'purchased'
        ? {
            title: t('page.tabStatus.emptyPurchasedTitle'),
            hint: t('page.tabStatus.emptyPurchasedHint'),
          }
        : {
            title: t('page.emptyMyList'),
            hint: '',
          };

  const displayName =
    profile?.userInfo.nickname || profile?.userInfo.realName || profile?.userInfo.username || '—';
  const avatarText = displayName.slice(0, 1).toUpperCase();
  const college = profile?.userProfile.college || profile?.userProfile.university || '';
  const degree = profile?.userProfile.degreeLevel ? String(profile.userProfile.degreeLevel) : '';

  const handleRetry = () => {
    if (myTab === 'published') refreshPublished();
    else if (myTab === 'favorites') refreshFavorites();
    else refreshPurchased();
  };

  return (
    <>
      <header className={page.pageHeader}>
        <button
          type="button"
          className={page.backButton}
          onClick={() => navigate(MARKET_PATH.root)}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t('page.backToMarket')}
        </button>
        <div className={page.headerRow}>
          <h1 className={page.pageTitle}>{t('page.myMarketTitle')}</h1>
          <Button variant="secondary" onPress={() => navigate(MARKET_PATH.manage)}>
            {t('page.manageEntry')}
          </Button>
        </div>
      </header>

      <section className={page.profileCard}>
        <div className={page.profileMain}>
          <div className={page.avatar} aria-hidden="true">
            {avatarText}
          </div>
          <div>
            <h2 className={page.profileName}>{displayName}</h2>
            <p className={page.profileMeta}>
              {[college, degree].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>
        <div className={page.statsRow}>
          <div className={page.statBlock}>
            <p className={page.statValue}>{published.length}</p>
            <p className={page.statLabel}>{t('page.stats.published')}</p>
          </div>
          <div className={page.statBlock}>
            <p className={page.statValue}>{favorites.length}</p>
            <p className={page.statLabel}>{t('page.stats.favorites')}</p>
          </div>
          <div className={page.statBlock}>
            <p className={page.statValue}>{purchased.length}</p>
            <p className={page.statLabel}>{t('page.stats.purchased')}</p>
          </div>
        </div>
      </section>

      <SegmentedTabs<MineTab>
        ariaLabel={t('page.myMarketTitle')}
        selectedKey={myTab}
        onSelectionChange={setMyTab}
        items={[
          { key: 'published', label: t('page.myTabs.published') },
          { key: 'favorites', label: t('page.myTabs.favorites') },
          { key: 'purchased', label: t('page.myTabs.purchased') },
        ]}
        className={page.myTabs}
        size="sm"
      />

      <MarketTabStatus
        status={tabStatus}
        emptyTitle={emptyCopy.title}
        emptyHint={emptyCopy.hint}
        loadingText={t('page.tabStatus.loading')}
        errorTitle={t('page.tabStatus.errorTitle')}
        errorHint={error ? parseErrorMessage(error) : t('page.tabStatus.errorHint')}
        retryLabel={t('page.tabStatus.retry')}
        onRetry={handleRetry}
      >
        <MarketListingGrid
          listings={myTabListings}
          priceLabel={priceLabel}
          showOnSaleBadge={myTab === 'published'}
          onSaleLabel={t('page.onSale')}
          emptyDescription={t('page.emptyMyList')}
          onOpen={(listing) =>
            setDetailTarget({
              resourceId: listing.resourceId,
              marketGroupId: listing.marketGroupId || undefined,
              offerVersion: listing.marketSaleInfo.offerVersion || undefined,
              resourceType: listing.resourceType,
            })
          }
        />
      </MarketTabStatus>
      <MarketDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />
    </>
  );
}

export default MarketMine;
