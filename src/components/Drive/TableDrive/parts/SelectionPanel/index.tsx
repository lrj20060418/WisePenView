import {
  isDriveActionTarget,
  type DriveActionTarget,
} from '@/components/Drive/common/driveComponentModel';
import {
  getTagPermissionPresetOption,
  getTagPermissionPresetValues,
  resolveTagPermissionPresetKeyFromTag,
  TAG_PERMISSION_PRESETS,
  type TagPermissionPresetKey,
} from '@/components/Drive/common/tagPermissionPreset';
import { DeleteNodeModal, RenameNodeModal } from '@/components/Drive/Modals';
import EntryIcon from '@/components/Icons/EntryIcon';
import { useTagService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import type { TagTreeNode } from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { Button, ListBox, toast, type Selection } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Pencil, ShieldCheck } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { TableDriveSelectionPanelProps } from './index.type';
import NodeInfoSection from './parts/NodeInfoSection';
import styles from './style.module.less';

const EMPTY_HINT = '选中左侧文件或文件夹以查看详情';
const TAG_PERMISSION_SIDEBAR_OPTIONS = TAG_PERMISSION_PRESETS;

function toActionTarget(node: DriveNode): DriveActionTarget | null {
  return isDriveActionTarget(node) ? node : null;
}

function TableDriveSelectionPanel({
  selectedRow,
  batchEditMode = false,
  batchSelectedCount = 0,
  groupId,
  canManageTagPermission = false,
  tagPermissionRefreshToken,
  onEnter,
  onOpen,
  onManageTagPermission,
  onClear,
  onRefresh,
}: TableDriveSelectionPanelProps) {
  const tagService = useTagService();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const savingPresetKeyRef = useRef<TagPermissionPresetKey | null>(null);
  const [optimisticPresetSelection, setOptimisticPresetSelection] = useState<{
    tagId: string;
    key: TagPermissionPresetKey;
    refreshToken: number;
  } | null>(null);

  const node = selectedRow?.node;
  const actionTarget = useMemo(() => (node ? toActionTarget(node) : null), [node]);
  const isFolder = node?.type === 'folder';
  const isFile = node?.type === 'resource' || node?.type === 'link';
  const canRename = actionTarget != null && actionTarget.type !== 'link';
  const folderTagId = node?.type === 'folder' ? node.tagId : undefined;
  const canShowTagPermission = Boolean(
    canManageTagPermission && groupId && folderTagId && !batchEditMode
  );
  const {
    data: selectedTag,
    loading: tagPermissionLoading,
    mutate: mutateSelectedTag,
  } = useRequest(
    async (): Promise<TagTreeNode | undefined> => {
      if (!folderTagId || !groupId) return undefined;
      let tag = tagService.getRawTagById(folderTagId, groupId);
      if (!tag) {
        await tagService.getRawTagTree(groupId);
        tag = tagService.getRawTagById(folderTagId, groupId);
      }
      return tag;
    },
    {
      ready: canShowTagPermission,
      refreshDeps: [folderTagId, groupId, tagPermissionRefreshToken],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );
  const resolvedPresetKey = resolveTagPermissionPresetKeyFromTag(selectedTag);
  const optimisticSelection = optimisticPresetSelection;
  const optimisticPresetKey =
    optimisticSelection &&
    optimisticSelection.tagId === folderTagId &&
    optimisticSelection.refreshToken === (tagPermissionRefreshToken ?? 0)
      ? optimisticSelection.key
      : undefined;
  const selectedPresetKey = optimisticPresetKey ?? resolvedPresetKey;
  const selectedPresetOption = getTagPermissionPresetOption(selectedPresetKey);
  const selectedPresetListKeys = new Set([selectedPresetKey]);

  const handleDeleteSuccess = () => {
    onClear();
    onRefresh();
  };

  const handlePresetSelect = async (presetKey: TagPermissionPresetKey) => {
    if (!folderTagId || !groupId) return;
    if (savingPresetKeyRef.current) return;
    if (presetKey === 'custom') {
      onManageTagPermission?.(folderTagId);
      return;
    }
    const presetValues = getTagPermissionPresetValues(presetKey);
    if (!presetValues) return;

    try {
      setOptimisticPresetSelection({
        tagId: folderTagId,
        key: presetKey,
        refreshToken: tagPermissionRefreshToken ?? 0,
      });
      savingPresetKeyRef.current = presetKey;
      await tagService.updateTag({
        groupId,
        targetTagId: folderTagId,
        taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
        taggedResourceAclGrantSpecifiedUsers: [],
        grantedActions: presetValues.grantedActions,
        tagMountPermissionScope: presetValues.tagMountPermissionScope,
        tagMountSpecifiedUsers: [],
      });
      mutateSelectedTag((prev) =>
        prev
          ? {
              ...prev,
              taggedResourceAclGrantScope: presetValues.taggedResourceAclGrantScope,
              taggedResourceAclGrantSpecifiedUsers: [],
              grantedActions: presetValues.grantedActions,
              tagMountPermissionScope: presetValues.tagMountPermissionScope,
              tagMountSpecifiedUsers: [],
            }
          : prev
      );
    } catch (err) {
      setOptimisticPresetSelection(null);
      toast.danger(parseErrorMessage(err));
    } finally {
      savingPresetKeyRef.current = null;
    }
  };

  const handlePresetSelectionChange = (keys: Selection) => {
    if (keys === 'all') return;
    const [key] = [...keys];
    if (key == null) return;
    void handlePresetSelect(String(key) as TagPermissionPresetKey);
  };

  if (batchEditMode) {
    return (
      <aside className={styles.panel} aria-label="全局编辑">
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <span className={styles.title}>全局编辑</span>
              <span className={styles.typeLabel}>批量选择模式</span>
            </div>
          </div>
          <div className={styles.body}>
            <span className={styles.fieldLabel}>已选</span>
            <p className={styles.description}>{batchSelectedCount} 项</p>
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedRow || !node || node.type === 'loading') {
    return (
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header} aria-hidden="true" />
          <div className={styles.emptyState}>{EMPTY_HINT}</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className={styles.panel} aria-label="选中节点详情">
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.iconWrap} aria-hidden="true">
              <EntryIcon
                entryType={selectedRow.entryType}
                resourceType={selectedRow.resourceType}
                resourceIconType={selectedRow.resourceIconType}
                size={18}
              />
            </span>
            <div className={styles.titleBlock}>
              <span className={styles.title}>{selectedRow.name}</span>
              <span className={styles.typeLabel}>{selectedRow.typeLabel}</span>
            </div>
            {canRename ? (
              <Button
                variant="secondary"
                size="sm"
                isIconOnly
                className={styles.renameBtn}
                aria-label="重命名"
                onPress={() => setRenameOpen(true)}
              >
                <Pencil size={16} aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <div className={styles.body}>
            <NodeInfoSection selectedRow={selectedRow} />
            {canShowTagPermission ? (
              <section className={styles.permissionSection} aria-label="权限策略">
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <ShieldCheck size={15} aria-hidden="true" />
                    <span className={styles.sectionTitle}>权限策略</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.sectionAction}
                    onPress={() => {
                      if (folderTagId) onManageTagPermission?.(folderTagId);
                    }}
                  >
                    设置
                  </Button>
                </div>
                <div className={styles.permissionSummary}>
                  {tagPermissionLoading
                    ? '正在加载权限策略'
                    : `${selectedPresetOption.label}：${selectedPresetOption.description}`}
                </div>
                <ListBox
                  aria-label="标签权限预设"
                  selectionMode="single"
                  selectedKeys={selectedPresetListKeys}
                  onSelectionChange={handlePresetSelectionChange}
                  className={styles.permissionPresetList}
                >
                  {TAG_PERMISSION_SIDEBAR_OPTIONS.map((preset) => (
                    <ListBox.Item id={preset.key} key={preset.key} textValue={preset.label}>
                      <span className={styles.presetContent}>
                        <span className={styles.presetTitle}>{preset.label}</span>
                        <span className={styles.presetDescription}>{preset.description}</span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </section>
            ) : null}
          </div>

          {actionTarget ? (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                className={styles.actionBtn}
                onPress={() => setDeleteOpen(true)}
              >
                删除
              </Button>
              {isFolder ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onEnter(node.id)}
                >
                  进入
                </Button>
              ) : null}
              {isFile ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.actionBtn}
                  onPress={() => onOpen(node)}
                >
                  打开
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <RenameNodeModal
        isOpen={renameOpen}
        node={actionTarget}
        groupId={groupId}
        onOpenChange={setRenameOpen}
        onSuccess={onRefresh}
      />
      <DeleteNodeModal
        isOpen={deleteOpen}
        node={actionTarget}
        groupId={groupId}
        onOpenChange={setDeleteOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}

export default TableDriveSelectionPanel;
