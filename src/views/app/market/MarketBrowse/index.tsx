/**
 * 资料集市 · 浏览：
 * - 搜索：?q= + MarketService；FolderTable + 滚动加载（对齐云盘，不分页按钮）
 * - 首页：已加入 PUBLIC 集市组
 * - 组内：Tag 路径文件夹 + 叶子 Resource FolderTable（筛选对齐；滚动加载）
 */
import { Select } from '@/components/Input';
import { useGroupService, useTagService } from '@/domains';
import { GROUP_TYPE } from '@/domains/Group';
import type { MarketSearchScope } from '@/domains/Market';
import { MARKET_SEARCH_SCOPE } from '@/domains/Market';
import type { TagTreeNode } from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { Label, ListBox } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MarketDetailModal from '../_components/MarketDetailModal';
import type { MarketDetailTarget } from '../_components/MarketDetailModal/index.type';
import MarketFolderCard from '../_components/MarketFolderCard';
import MarketGroupCardView from '../_components/MarketGroupCard';
import MarketResourceTable from '../_components/MarketResourceTable';
import type { MarketResourceTableItem } from '../_components/MarketResourceTable/index.type';
import MarketTabStatus from '../_components/MarketTabStatus';
import { useMarketFolderResourcesLoadMore } from '../_hooks/useMarketFolderResourcesLoadMore';
import { useMarketSearchLoadMore } from '../_hooks/useMarketSearchLoadMore';
import {
  buildMarketFolderBreadcrumb,
  getVisibleMarketFolderChildren,
  isMarketFolderLeaf,
  isVisibleMarketFolderTag,
  marketFolderDisplayName,
} from '../_utils/marketFolder';
import { marketHitToTableItem, marketResourceToTableItem } from '../_utils/marketTableItems';
import { MARKET_PATH } from '../market.paths';
import type { MarketSaleFilter } from '../mockData';
import page from './style.module.less';

const TYPE_OPTIONS: MarketSearchScope[] = [
  MARKET_SEARCH_SCOPE.ALL,
  MARKET_SEARCH_SCOPE.DOCUMENT,
  MARKET_SEARCH_SCOPE.NOTE,
];
const SALE_OPTIONS: MarketSaleFilter[] = ['ALL', 'ON_SALE', 'OFF_SHELF'];

function isNoteLike(resourceType: string): boolean {
  return resourceType === 'note' || resourceType === 'drawio';
}

function matchesSaleFilter(status: string | undefined, saleFilter: MarketSaleFilter): boolean {
  if (saleFilter === 'ALL') return true;
  const onSale = status === 'PUBLISHED';
  if (saleFilter === 'ON_SALE') return onSale;
  return !onSale;
}

function matchesTypeFilter(resourceType: string | undefined, scope: MarketSearchScope): boolean {
  if (scope === MARKET_SEARCH_SCOPE.ALL) return true;
  const noteLike = isNoteLike((resourceType ?? '').toLowerCase());
  if (scope === MARKET_SEARCH_SCOPE.NOTE) return noteLike;
  return !noteLike;
}

function MarketBrowse() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const groupService = useGroupService();
  const tagService = useTagService();
  const { groupId, folderId } = useParams<{ groupId?: string; folderId?: string }>();
  const [searchParams] = useSearchParams();

  const committedKeyword = (searchParams.get('q') ?? '').trim();
  const [scope, setScope] = useState<MarketSearchScope>(MARKET_SEARCH_SCOPE.ALL);
  const [saleFilter, setSaleFilter] = useState<MarketSaleFilter>('ON_SALE');
  const [detailTarget, setDetailTarget] = useState<MarketDetailTarget | null>(null);

  const isSearching = committedKeyword.length > 0;
  const inGroupBrowse = Boolean(groupId) && !isSearching;

  const {
    list: searchHits,
    total: searchTotal,
    loading: searchLoading,
    loadingMore: searchLoadingMore,
    error: searchError,
    hasMore: searchHasMore,
    loadMore: loadMoreSearch,
    refresh: refreshSearch,
  } = useMarketSearchLoadMore({
    ready: isSearching,
    keyword: committedKeyword,
    scope,
    marketGroupId: groupId,
  });

  const {
    data: marketGroups = [],
    loading: groupsLoading,
    error: groupsError,
    refresh: refreshGroups,
  } = useRequest(
    async () => {
      const groups = await groupService.fetchAllMyGroups();
      return groups.filter((group) => group.groupType === GROUP_TYPE.PUBLIC);
    },
    {
      ready: !isSearching && !groupId,
      refreshDeps: [groupService],
    }
  );

  const {
    data: activeGroup,
    loading: groupInfoLoading,
    error: groupInfoError,
    refresh: refreshGroupInfo,
  } = useRequest(() => groupService.fetchGroupBaseInfo(groupId as string), {
    ready: inGroupBrowse,
    refreshDeps: [groupId, groupService],
  });

  const {
    data: folderChildren = [],
    loading: foldersLoading,
    error: foldersError,
    refresh: refreshFolders,
  } = useRequest(
    async () => {
      const roots = await tagService.getRawTagTree(groupId);
      if (!folderId) {
        return roots.filter(isVisibleMarketFolderTag);
      }
      const node = tagService.getRawTagById(folderId, groupId);
      return getVisibleMarketFolderChildren(node);
    },
    {
      ready: inGroupBrowse && Boolean(activeGroup?.groupName),
      refreshDeps: [groupId, folderId, tagService, activeGroup?.groupName],
    }
  );

  const activeFolderTag: TagTreeNode | undefined =
    folderId && groupId ? tagService.getRawTagById(folderId, groupId) : undefined;
  const showDriveTable = Boolean(folderId && isMarketFolderLeaf(activeFolderTag));

  const {
    list: leafResourceList,
    total: leafResourceTotal,
    loading: resourcesLoading,
    loadingMore: resourcesLoadingMore,
    error: resourcesError,
    hasMore: resourcesHasMore,
    loadMore: loadMoreResources,
    refresh: refreshResources,
  } = useMarketFolderResourcesLoadMore({
    ready: inGroupBrowse && showDriveTable && Boolean(activeGroup?.groupName),
    groupId,
    folderId,
  });

  const filteredHits = searchHits.filter((hit) =>
    matchesSaleFilter(hit.marketSaleInfo?.status, saleFilter)
  );

  const filteredFolderResources = leafResourceList.filter(
    (resource) =>
      matchesTypeFilter(resource.resourceType, scope) &&
      matchesSaleFilter(resource.marketSaleInfos?.[groupId ?? '']?.status, saleFilter)
  );

  const breadcrumb =
    folderId && groupId
      ? buildMarketFolderBreadcrumb(folderId, (tagId) => tagService.getRawTagById(tagId, groupId))
      : [];

  const searchTableItems = filteredHits.map(marketHitToTableItem);
  const folderTableItems = groupId
    ? filteredFolderResources.map((resource) => marketResourceToTableItem(resource, groupId))
    : [];

  const handleOpenHitItem = (item: MarketResourceTableItem) => {
    const hit = filteredHits.find((row) => row.resourceId === item.id);
    if (!hit) return;
    setDetailTarget({
      resourceId: hit.resourceId,
      marketGroupId: hit.marketGroupId || groupId,
      offerVersion: hit.marketSaleInfo?.offerVersion,
      resourceType: hit.resourceType,
    });
  };

  const handleOpenResourceItem = (item: MarketResourceTableItem) => {
    const resource = filteredFolderResources.find((row) => row.resourceId === item.id);
    if (!resource) return;
    const sale = groupId ? resource.marketSaleInfos?.[groupId] : undefined;
    setDetailTarget({
      resourceId: resource.resourceId,
      marketGroupId: groupId,
      offerVersion: sale?.offerVersion,
      resourceType: resource.resourceType,
    });
  };

  const detailModal = (
    <MarketDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />
  );

  const handleScopeChange = (value: string) => {
    setScope(value as MarketSearchScope);
  };

  const handleSaleFilterChange = (value: string) => {
    setSaleFilter(value as MarketSaleFilter);
  };

  const renderFilters = () => (
    <div className={page.filters}>
      <Select
        aria-label={t('page.filterType')}
        value={scope}
        onChange={(value) => {
          if (typeof value === 'string') handleScopeChange(value);
        }}
        className={page.filterSelect}
      >
        <Label>{t('page.filterType')}</Label>
        <Select.Trigger />
        <Select.Popover>
          <ListBox>
            {TYPE_OPTIONS.map((key) => (
              <ListBox.Item key={key} id={key} textValue={t(`page.resourceType.${key}`)}>
                {t(`page.resourceType.${key}`)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Select
        aria-label={t('page.filterStatus')}
        value={saleFilter}
        onChange={(value) => {
          if (typeof value === 'string') handleSaleFilterChange(value);
        }}
        className={page.filterSelect}
      >
        <Label>{t('page.filterStatus')}</Label>
        <Select.Trigger />
        <Select.Popover>
          <ListBox>
            {SALE_OPTIONS.map((key) => (
              <ListBox.Item key={key} id={key} textValue={t(`page.saleFilter.${key}`)}>
                {t(`page.saleFilter.${key}`)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );

  if (isSearching) {
    const searchStatus = searchLoading
      ? 'loading'
      : searchError
        ? 'error'
        : filteredHits.length === 0
          ? 'empty'
          : 'content';

    return (
      <>
        <header className={page.pageHeader}>
          <h1 className={page.pageTitle}>{t('page.title')}</h1>
          <span className={page.pageSubtitle}>{t('page.subtitle')}</span>
        </header>
        {renderFilters()}
        <div className={page.resultMeta}>
          <h2 className={page.resultHeading}>
            {t('page.resultHeading', { keyword: committedKeyword })}
          </h2>
          {!searchLoading && !searchError ? (
            <span className={page.resultCount}>
              {t('page.resultCount', { count: searchTotal })}
            </span>
          ) : null}
        </div>
        <MarketTabStatus
          status={searchStatus}
          loadingText={t('page.tabStatus.loading')}
          emptyTitle={t('page.emptySearchResult')}
          emptyHint={t('page.emptySearchHint')}
          errorTitle={t('page.tabStatus.errorTitle')}
          errorHint={searchError ? parseErrorMessage(searchError) : t('page.tabStatus.errorHint')}
          retryLabel={t('page.tabStatus.retry')}
          onRetry={refreshSearch}
        >
          <MarketResourceTable
            items={searchTableItems}
            onOpen={handleOpenHitItem}
            totalCount={searchTotal}
            loadMore={{
              hasMore: searchHasMore,
              loading: searchLoadingMore,
              onLoadMore: loadMoreSearch,
            }}
          />
        </MarketTabStatus>
        {detailModal}
      </>
    );
  }

  if (!groupId) {
    const groupsStatus = groupsLoading
      ? 'loading'
      : groupsError
        ? 'error'
        : marketGroups.length === 0
          ? 'empty'
          : 'content';

    return (
      <>
        <header className={`${page.pageHeader} ${page.homeHeader}`}>
          <h1 className={page.pageTitle}>{t('page.title')}</h1>
          <span className={page.pageSubtitle}>{t('page.subtitle')}</span>
        </header>
        <section className={page.homeSection}>
          <div className={page.resultMeta}>
            <h2 className={page.resultHeading}>{t('page.joinedGroupsHeading')}</h2>
            {groupsStatus === 'content' ? (
              <span className={page.resultCount}>
                {t('page.joinedGroupsCount', { count: marketGroups.length })}
              </span>
            ) : null}
          </div>
          <MarketTabStatus
            status={groupsStatus}
            loadingText={t('page.tabStatus.loading')}
            emptyTitle={t('page.emptyGroups')}
            emptyHint={t('page.emptyGroupsHint')}
            errorTitle={t('page.tabStatus.errorTitle')}
            errorHint={groupsError ? parseErrorMessage(groupsError) : t('page.tabStatus.errorHint')}
            retryLabel={t('page.tabStatus.retry')}
            onRetry={refreshGroups}
          >
            <div className={page.listingGrid}>
              {marketGroups.map((group) => (
                <MarketGroupCardView
                  key={group.groupId}
                  group={group}
                  memberCountLabel={t('page.groupMembers', { count: group.memberCount })}
                  onOpen={(next) => navigate(MARKET_PATH.group(next.groupId))}
                />
              ))}
            </div>
          </MarketTabStatus>
        </section>
      </>
    );
  }

  if (groupInfoLoading || !activeGroup?.groupName) {
    if (groupInfoError || (!groupInfoLoading && !activeGroup?.groupName)) {
      return (
        <MarketTabStatus
          status="error"
          loadingText={t('page.tabStatus.loading')}
          emptyTitle=""
          emptyHint=""
          errorTitle={t('page.tabStatus.errorTitle')}
          errorHint={
            groupInfoError ? parseErrorMessage(groupInfoError) : t('page.tabStatus.errorHint')
          }
          retryLabel={t('page.tabStatus.retry')}
          onRetry={refreshGroupInfo}
        >
          {null}
        </MarketTabStatus>
      );
    }
    return (
      <MarketTabStatus
        status="loading"
        loadingText={t('page.tabStatus.loading')}
        emptyTitle=""
        emptyHint=""
        errorTitle=""
        errorHint=""
        retryLabel={t('page.tabStatus.retry')}
        onRetry={refreshGroupInfo}
      >
        {null}
      </MarketTabStatus>
    );
  }

  const folderContentStatus = showDriveTable
    ? resourcesLoading
      ? 'loading'
      : resourcesError
        ? 'error'
        : filteredFolderResources.length === 0
          ? 'empty'
          : 'content'
    : foldersLoading
      ? 'loading'
      : foldersError
        ? 'error'
        : folderChildren.length === 0
          ? 'empty'
          : 'content';

  return (
    <>
      <header className={page.pageHeader}>
        <nav className={page.breadcrumb} aria-label={t('page.breadcrumbAria')}>
          <button type="button" className={page.crumb} onClick={() => navigate(MARKET_PATH.root)}>
            {t('page.title')}
          </button>
          <>
            <ChevronRight size={14} aria-hidden="true" />
            <button
              type="button"
              className={page.crumb}
              onClick={() => navigate(MARKET_PATH.group(activeGroup.groupId))}
            >
              {activeGroup.groupName}
            </button>
          </>
          {breadcrumb.map((node) => (
            <span key={node.tagId} className={page.crumbTrail}>
              <ChevronRight size={14} aria-hidden="true" />
              <button
                type="button"
                className={page.crumb}
                onClick={() => navigate(MARKET_PATH.folder(groupId, node.tagId))}
              >
                {marketFolderDisplayName(node.tagName)}
              </button>
            </span>
          ))}
        </nav>
        <h1 className={page.pageTitle}>
          {activeFolderTag
            ? marketFolderDisplayName(activeFolderTag.tagName)
            : activeGroup.groupName}
        </h1>
        <span className={page.pageSubtitle}>
          {activeFolderTag?.tagDesc ?? activeGroup.groupDesc ?? t('page.subtitle')}
        </span>
      </header>

      {showDriveTable ? renderFilters() : null}

      <MarketTabStatus
        status={folderContentStatus}
        loadingText={t('page.tabStatus.loading')}
        emptyTitle={showDriveTable ? t('page.emptyFolderFiles') : t('page.emptyFolders')}
        emptyHint={showDriveTable ? t('page.emptyFolderFilesHint') : t('page.emptyFoldersHint')}
        errorTitle={t('page.tabStatus.errorTitle')}
        errorHint={
          showDriveTable
            ? resourcesError
              ? parseErrorMessage(resourcesError)
              : t('page.tabStatus.errorHint')
            : foldersError
              ? parseErrorMessage(foldersError)
              : t('page.tabStatus.errorHint')
        }
        retryLabel={t('page.tabStatus.retry')}
        onRetry={showDriveTable ? refreshResources : refreshFolders}
      >
        {showDriveTable ? (
          <MarketResourceTable
            items={folderTableItems}
            onOpen={handleOpenResourceItem}
            totalCount={leafResourceTotal}
            loadMore={{
              hasMore: resourcesHasMore,
              loading: resourcesLoadingMore,
              onLoadMore: loadMoreResources,
            }}
          />
        ) : (
          <div className={page.listingGrid}>
            {folderChildren.map((folder) => {
              const childCount = getVisibleMarketFolderChildren(folder).length;
              return (
                <MarketFolderCard
                  key={folder.tagId}
                  folder={folder}
                  displayName={marketFolderDisplayName(folder.tagName)}
                  itemCountLabel={
                    childCount > 0
                      ? t('page.folderChildren', { count: childCount })
                      : t('page.folderFilesHint')
                  }
                  onOpen={(next) => navigate(MARKET_PATH.folder(groupId, next.tagId))}
                />
              );
            })}
          </div>
        )}
      </MarketTabStatus>
      {detailModal}
    </>
  );
}

export default MarketBrowse;
