/**
 * S11 · 我的资料发布管理：按销售状态筛选 + 列表操作（下架/重新提交）。
 */
import { EmptyState } from '@/components/Feedback';
import { useGroupService, useMarketService, useResourceService } from '@/domains';
import type { MarketManagedListing, MarketSaleStatus } from '@/domains/Market';
import { MARKET_SALE_STATUS } from '@/domains/Market';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MarketOffShelfDialog from '../_components/MarketOffShelfDialog';
import MarketTabStatus from '../_components/MarketTabStatus';
import { useMarketSession } from '../_context/useMarketSession';
import { useMarketPriceLabel } from '../_hooks/useMarketPriceLabel';
import {
  countManagedBySaleStatus,
  flattenManagedListings,
  managedListingKey,
  managedListingPrice,
  managedToPublishDraft,
} from '../_utils/managedListing';
import { marketCoverForId } from '../_utils/marketCover';
import { MARKET_PATH } from '../market.paths';
import page from './style.module.less';

const STATUS_ORDER: MarketSaleStatus[] = [
  MARKET_SALE_STATUS.PENDING_REVIEW,
  MARKET_SALE_STATUS.PUBLISHED,
  MARKET_SALE_STATUS.REJECTED,
  MARKET_SALE_STATUS.OFF_SHELF,
  MARKET_SALE_STATUS.BANNED,
];

const PAGE_SIZE = 100;

function MarketManage() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const priceLabel = useMarketPriceLabel();
  const resourceService = useResourceService();
  const marketService = useMarketService();
  const groupService = useGroupService();
  const { setPublishDraft } = useMarketSession();
  const [status, setStatus] = useState<MarketSaleStatus>(MARKET_SALE_STATUS.PENDING_REVIEW);
  const [offShelfTarget, setOffShelfTarget] = useState<MarketManagedListing | null>(null);

  const { data: groupNameById = {} } = useRequest(
    async () => {
      const groups = await groupService.fetchAllMyGroups();
      return Object.fromEntries(groups.map((g) => [g.groupId, g.groupName]));
    },
    { onError: () => undefined }
  );

  const {
    data: items = [],
    loading,
    error,
    refresh,
    mutate,
  } = useRequest(
    async () => {
      const pageResult = await resourceService.getUserResources({
        page: 1,
        size: PAGE_SIZE,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
      });
      return flattenManagedListings(pageResult.list);
    },
    {
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const counts = countManagedBySaleStatus(items);
  const filtered = items.filter((item) => item.marketSaleInfo.status === status);
  const tabStatus = loading ? 'loading' : error ? 'error' : 'content';

  const statusChipClass = (saleStatus: MarketSaleStatus) => {
    switch (saleStatus) {
      case MARKET_SALE_STATUS.PUBLISHED:
        return page.statusPublished;
      case MARKET_SALE_STATUS.PENDING_REVIEW:
        return page.statusPending;
      case MARKET_SALE_STATUS.REJECTED:
      case MARKET_SALE_STATUS.BANNED:
        return page.statusRejected;
      default:
        return page.statusOffShelf;
    }
  };

  const handleResubmit = async (row: MarketManagedListing) => {
    if (row.tagIds.length === 0) {
      const draft = managedToPublishDraft(row);
      setPublishDraft(draft);
      navigate(MARKET_PATH.edit(managedListingKey(row)), { state: { draft } });
      toast.danger(t('page.publish.needFolderTag'));
      return;
    }
    try {
      await marketService.publishSaleInfo({
        resourceId: row.resourceId,
        marketGroupId: row.marketGroupId,
        tagIds: row.tagIds,
        price: managedListingPrice(row),
        offerVersion: row.marketSaleInfo.offerVersion ?? 1,
      });
      mutate(
        items.map((item) =>
          managedListingKey(item) === managedListingKey(row)
            ? {
                ...item,
                marketSaleInfo: {
                  ...item.marketSaleInfo,
                  status: MARKET_SALE_STATUS.PENDING_REVIEW,
                  auditMessage: undefined,
                },
              }
            : item
        )
      );
      toast.success(t('page.manage.resubmitted'));
      setStatus(MARKET_SALE_STATUS.PENDING_REVIEW);
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    }
  };

  return (
    <div className={page.root}>
      <header className={page.header}>
        <div>
          <h1 className={page.title}>{t('page.manage.title')}</h1>
          <p className={page.subtitle}>{t('page.manage.subtitle')}</p>
        </div>
        <Button variant="primary" onPress={() => navigate(MARKET_PATH.publish)}>
          <Plus size={16} aria-hidden="true" />
          {t('page.topBar.publish')}
        </Button>
      </header>

      <MarketTabStatus
        status={tabStatus}
        loadingText={t('page.tabStatus.loading')}
        emptyTitle={t('page.manage.empty')}
        emptyHint=""
        errorTitle={t('page.tabStatus.errorTitle')}
        errorHint={error ? parseErrorMessage(error) : t('page.tabStatus.errorHint')}
        retryLabel={t('page.tabStatus.retry')}
        onRetry={refresh}
      >
        <div className={page.layout}>
          <aside className={page.statusList} aria-label={t('page.manage.statusFilterAria')}>
            {STATUS_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className={`${page.statusCard} ${status === key ? page.statusCardActive : ''}`}
                onClick={() => setStatus(key)}
              >
                <span className={page.statusIcon} aria-hidden="true">
                  {t(`page.saleStatus.${key}`).slice(0, 1)}
                </span>
                <span className={page.statusCopy}>
                  <strong>{t(`page.saleStatus.${key}`)}</strong>
                  <span>{t(`page.manage.statusHint.${key}`)}</span>
                </span>
                <strong className={page.statusCount}>{counts[key]}</strong>
              </button>
            ))}
          </aside>

          <section className={page.listPane}>
            {filtered.length === 0 ? (
              <div className={page.empty}>
                <EmptyState title={t('page.manage.empty')} description="" />
              </div>
            ) : (
              <ul className={page.list}>
                {filtered.map((item) => (
                  <li key={managedListingKey(item)} className={page.row}>
                    <img
                      className={page.thumb}
                      src={item.coverImageUrl || marketCoverForId(item.resourceId)}
                      alt=""
                    />
                    <div className={page.meta}>
                      <h3>{item.resourceName}</h3>
                      <p>{item.preview || t('page.manage.noPreview')}</p>
                    </div>
                    <Chip
                      size="sm"
                      variant="soft"
                      className={statusChipClass(item.marketSaleInfo.status)}
                    >
                      <Chip.Label>{t(`page.saleStatus.${item.marketSaleInfo.status}`)}</Chip.Label>
                    </Chip>
                    <span className={page.price}>{priceLabel(managedListingPrice(item))}</span>
                    <span className={page.time}>
                      {groupNameById[item.marketGroupId] || item.marketGroupId}
                    </span>
                    <div className={page.actions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          const draft = managedToPublishDraft(item);
                          setPublishDraft(draft);
                          navigate(MARKET_PATH.edit(managedListingKey(item)), { state: { draft } });
                        }}
                      >
                        {t('page.manage.edit')}
                      </Button>
                      {item.marketSaleInfo.status === MARKET_SALE_STATUS.PUBLISHED ? (
                        <Button size="sm" variant="danger" onPress={() => setOffShelfTarget(item)}>
                          {t('page.manage.offShelf')}
                        </Button>
                      ) : null}
                      {item.marketSaleInfo.status === MARKET_SALE_STATUS.REJECTED ||
                      item.marketSaleInfo.status === MARKET_SALE_STATUS.OFF_SHELF ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => {
                            void handleResubmit(item);
                          }}
                        >
                          {t('page.manage.resubmit')}
                        </Button>
                      ) : null}
                      {item.marketSaleInfo.status === MARKET_SALE_STATUS.REJECTED &&
                      item.marketSaleInfo.auditMessage ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => setOffShelfTarget(item)}
                        >
                          {t('page.manage.viewReason')}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </MarketTabStatus>

      <MarketOffShelfDialog
        isOpen={Boolean(offShelfTarget)}
        resourceName={offShelfTarget?.resourceName ?? ''}
        priceLabel={priceLabel(offShelfTarget ? managedListingPrice(offShelfTarget) : 0)}
        auditMessage={offShelfTarget?.marketSaleInfo.auditMessage}
        labels={{
          title: t('page.offShelf.title'),
          cancel: t('page.offShelf.cancel'),
          confirm: t('page.offShelf.confirm'),
          resubmit: t('page.offShelf.resubmit'),
          effectSearchTitle: t('page.offShelf.effectSearchTitle'),
          effectSearchDesc: t('page.offShelf.effectSearchDesc'),
          effectBuyerTitle: t('page.offShelf.effectBuyerTitle'),
          effectBuyerDesc: t('page.offShelf.effectBuyerDesc'),
          rejectExampleTitle: t('page.offShelf.rejectReasonTitle'),
        }}
        onOpenChange={(open) => {
          if (!open) setOffShelfTarget(null);
        }}
        onConfirmOffShelf={() => {
          if (!offShelfTarget) return;
          void (async () => {
            try {
              await marketService.offShelfSaleInfo({
                resourceId: offShelfTarget.resourceId,
                marketGroupId: offShelfTarget.marketGroupId,
              });
              mutate(
                items.map((row) =>
                  managedListingKey(row) === managedListingKey(offShelfTarget)
                    ? {
                        ...row,
                        marketSaleInfo: {
                          ...row.marketSaleInfo,
                          status: MARKET_SALE_STATUS.OFF_SHELF,
                        },
                      }
                    : row
                )
              );
              toast.success(t('page.offShelf.success'));
              setOffShelfTarget(null);
              setStatus(MARKET_SALE_STATUS.OFF_SHELF);
            } catch (err) {
              toast.danger(parseErrorMessage(err));
            }
          })();
        }}
        onResubmit={() => {
          if (!offShelfTarget) return;
          const draft = managedToPublishDraft(offShelfTarget);
          setPublishDraft(draft);
          setOffShelfTarget(null);
          navigate(MARKET_PATH.edit(managedListingKey(offShelfTarget)), { state: { draft } });
        }}
      />
    </div>
  );
}

export default MarketManage;
