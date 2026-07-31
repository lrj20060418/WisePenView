/**
 * 资料集市 · 发布 / 编辑资料（同一表单；有 listingId 时为编辑态）。
 * 编辑态从 resourceId__marketGroupId 重拉个人售卖信息，刷新可恢复。
 */
import { EmptyState } from '@/components/Feedback';
import {
  useGroupService,
  useMarketService,
  useResourceService,
  useTagService,
  useUserService,
} from '@/domains';
import { GROUP_TYPE } from '@/domains/Group';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import MarketPublishPanel from '../_components/MarketPublishPanel';
import MarketTabStatus from '../_components/MarketTabStatus';
import { useMarketSession } from '../_context/useMarketSession';
import {
  flattenManagedListings,
  managedToPublishDraft,
  parseManagedListingKey,
} from '../_utils/managedListing';
import { flattenVisibleMarketFolders } from '../_utils/marketFolder';
import { MARKET_PATH } from '../market.paths';
import { createEmptyPublishDraft, type MarketPublishDraft } from '../mockData';
import page from './style.module.less';

interface PublishLocationState {
  draft?: MarketPublishDraft;
}

function MarketPublish() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams<{ listingId?: string }>();
  const { publishDraft, setPublishDraft } = useMarketSession();
  const marketService = useMarketService();
  const userService = useUserService();
  const groupService = useGroupService();
  const tagService = useTagService();
  const resourceService = useResourceService();
  const [submitting, setSubmitting] = useState(false);

  const stateDraft = (location.state as PublishLocationState | null)?.draft;
  const parsedEdit = listingId ? parseManagedListingKey(listingId) : null;
  const isEditing = Boolean(listingId);

  const { data: profile } = useRequest(() => userService.getFullUserInfo(), {
    onError: () => undefined,
  });

  const { data: marketGroups = [], loading: groupsLoading } = useRequest(
    async () => {
      const groups = await groupService.fetchAllMyGroups();
      return groups
        .filter((group) => group.groupType === GROUP_TYPE.PUBLIC)
        .map((group) => ({ groupId: group.groupId, groupName: group.groupName }));
    },
    { onError: () => undefined }
  );

  const {
    data: editListing,
    loading: editLoading,
    error: editError,
    refresh: refreshEdit,
  } = useRequest(
    async () => {
      if (!parsedEdit) return null;
      const pageResult = await resourceService.getUserResources({
        page: 1,
        size: 100,
        sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
        sortDir: RESOURCE_SORT_DIR.DESC,
      });
      const rows = flattenManagedListings(pageResult.list);
      return (
        rows.find(
          (row) =>
            row.resourceId === parsedEdit.resourceId &&
            row.marketGroupId === parsedEdit.marketGroupId
        ) ?? null
      );
    },
    {
      ready: Boolean(parsedEdit),
      refreshDeps: [listingId, resourceService],
      onError: () => undefined,
    }
  );

  const { data: folderOptions = [], loading: foldersLoading } = useRequest(
    async () => {
      const roots = await tagService.getRawTagTree(publishDraft.marketGroupId);
      return flattenVisibleMarketFolders(roots);
    },
    {
      ready: Boolean(publishDraft.marketGroupId),
      refreshDeps: [publishDraft.marketGroupId, tagService],
      onError: () => undefined,
    }
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：编辑路由参数、location.state 草稿或重拉的售卖行变化后回填发布草稿。
   * 不可替代原因：草稿同时来自路由 state 与异步 getUserResources，需在外部数据就绪后写入 Session。
   * cleanup：无订阅，无需清理。
   */
  useEffect(() => {
    if (!listingId) {
      setPublishDraft(createEmptyPublishDraft());
      return;
    }
    if (stateDraft && stateDraft.editingListingId === listingId) {
      setPublishDraft(stateDraft);
      return;
    }
    if (editListing) {
      setPublishDraft(managedToPublishDraft(editListing));
    }
  }, [listingId, stateDraft, editListing, setPublishDraft]);

  const listingMissing =
    Boolean(listingId) &&
    !editLoading &&
    !stateDraft &&
    !editListing &&
    (Boolean(editError) || (parsedEdit != null && editListing === null));

  const handleSubmit = async () => {
    const resourceId = publishDraft.resourceDriveRef?.resourceId;
    if (!resourceId) {
      toast.danger(t('page.publish.needDriveResource'));
      return;
    }
    if (!publishDraft.marketGroupId.trim()) {
      toast.danger(t('page.publish.needMarketGroup'));
      return;
    }
    if (!publishDraft.folderTagId.trim()) {
      toast.danger(t('page.publish.needFolderTag'));
      return;
    }
    const price = Number(publishDraft.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.danger(t('page.publish.needPrice'));
      return;
    }

    setSubmitting(true);
    try {
      await marketService.publishSaleInfo({
        resourceId,
        marketGroupId: publishDraft.marketGroupId.trim(),
        tagIds: [publishDraft.folderTagId.trim()],
        price,
        offerVersion: publishDraft.offerVersion || 1,
      });
      toast.success(isEditing ? t('page.publish.editSubmitted') : t('page.publish.submitted'));
      setPublishDraft(createEmptyPublishDraft());
      navigate(isEditing ? MARKET_PATH.manage : MARKET_PATH.mine);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const previewOwnerName =
    profile?.userInfo.nickname || profile?.userInfo.realName || profile?.userInfo.username || '—';
  const previewCollege = profile?.userProfile.college || profile?.userProfile.university || '—';

  if (listingId && editLoading && !stateDraft && !publishDraft.resourceDriveRef) {
    return (
      <MarketTabStatus
        status="loading"
        loadingText={t('page.tabStatus.loading')}
        emptyTitle=""
        emptyHint=""
        errorTitle=""
        errorHint=""
        retryLabel={t('page.tabStatus.retry')}
        onRetry={refreshEdit}
      >
        {null}
      </MarketTabStatus>
    );
  }

  if (listingMissing) {
    return (
      <div className={page.missing}>
        <EmptyState
          title={t('page.publish.editNotFound')}
          description={t('page.publish.editNotFoundHint')}
        />
      </div>
    );
  }

  return (
    <div className={page.root}>
      <MarketPublishPanel
        mode={isEditing ? 'edit' : 'create'}
        draft={publishDraft}
        previewOwnerName={previewOwnerName}
        previewCollege={previewCollege}
        marketGroups={marketGroups}
        folderOptions={folderOptions}
        groupsLoading={groupsLoading}
        foldersLoading={foldersLoading}
        submitting={submitting}
        labels={{
          back: isEditing ? t('page.publish.backToManage') : t('page.publish.back'),
          pageTitle: isEditing ? t('page.publish.editFormTitle') : t('page.publish.title'),
          pageSubtitle: t('page.publish.subtitleReal'),
          formTitle: isEditing ? t('page.publish.editFormTitle') : t('page.publish.formTitle'),
          uploadFile: t('page.publish.uploadCloud'),
          uploadFileHint: t('page.publish.uploadFileHintCloud'),
          price: t('page.publish.price'),
          coinSuffix: t('page.publish.coinSuffix'),
          marketGroupId: t('page.publish.marketGroupId'),
          folderTagId: t('page.publish.folderTagId'),
          pickGroupFirst: t('page.publish.pickGroupFirst'),
          noGroups: t('page.publish.noGroups'),
          noFolders: t('page.publish.noFolders'),
          loadingGroups: t('page.publish.loadingGroups'),
          loadingFolders: t('page.publish.loadingFolders'),
          saveDraft: t('page.publish.saveDraft'),
          submit: isEditing ? t('page.publish.resubmit') : t('page.publish.submit'),
          previewTitle: t('page.publish.previewTitle'),
          previewEmptyTitle: t('page.publish.previewEmptyTitle'),
        }}
        onBack={() => navigate(isEditing ? MARKET_PATH.manage : MARKET_PATH.root)}
        onChange={setPublishDraft}
        onSaveDraft={() => toast.success(t('page.publish.draftSavedToast'))}
        onSubmit={() => {
          void handleSubmit();
        }}
      />
    </div>
  );
}

export default MarketPublish;
