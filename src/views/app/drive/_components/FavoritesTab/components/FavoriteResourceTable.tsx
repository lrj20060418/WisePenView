import type { DriveTableRow } from '@/components/Drive/TableDrive/index.type';
import TableDriveSelectionPanel from '@/components/Drive/TableDrive/parts/SelectionPanel';
import EntryIcon from '@/components/Icons/EntryIcon';
import DataTable from '@/components/Table/DataTable';
import type {
  DataTableColumn,
  DataTableRowPressContext,
} from '@/components/Table/DataTable/index.type';
import TableRowActions from '@/components/Table/shared/TableRowActions';
import type { TableRowActionItem } from '@/components/Table/shared/TableRowActions/index.type';
import type { DriveNode } from '@/domains/Drive';
import { buildDriveNodeScope } from '@/domains/Drive';
import type { FavoriteItem } from '@/domains/Interact';
import type { ResourceItem } from '@/domains/Resource';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import { formatFileSize } from '@/utils/format/formatFileSize';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import CollectionPickerModal from '@/views/workspace/_components/ResourceFavoriteAction/CollectionPickerModal';
import { useCollectionPickerController } from '@/views/workspace/_components/ResourceFavoriteAction/hooks/useCollectionPickerController';
import { useState } from 'react';
import { useFavoriteResources } from '../hooks/useFavoriteResources';
import styles from '../style.module.less';
import UnfavoriteResourceModal from './UnfavoriteResourceModal';

interface FavoriteResourceTableProps {
  collectionId?: string;
  collectionName: string;
  collectionItemCount: number;
  onCollectionChanged: () => void;
  emptyDescription: string;
}

interface FavoriteCollectionPickerProps {
  resourceId: string;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}

function FavoriteCollectionPicker({
  resourceId,
  onOpenChange,
  onConfirmed,
}: FavoriteCollectionPickerProps) {
  const controller = useCollectionPickerController({
    resourceId,
    onOpenChange,
    onConfirmed: () => onConfirmed(),
  });
  return <CollectionPickerModal {...controller} />;
}

function toFavoriteTableRow(resource: ResourceItem): DriveTableRow {
  const node: DriveNode = {
    type: 'resource',
    id: `favorite:${resource.resourceId}`,
    parentId: 'favorite-root',
    scope: buildDriveNodeScope(),
    resourceId: resource.resourceId,
    title: resource.resourceName,
    resourceType: resource.resourceType,
    resourceIconType: resource.resourceIconType ?? 'file',
    size: resource.size,
    folderTagId: '',
  };

  return {
    id: node.id,
    name: resource.resourceName,
    entryType: 'resource',
    resourceType: resource.resourceType,
    resourceIconType: resource.resourceIconType,
    sizeLabel: formatFileSize(resource.size),
    typeLabel: resource.resourceType ?? '资源',
    node,
  };
}

function FavoriteResourceTable({
  collectionId,
  collectionName,
  collectionItemCount,
  onCollectionChanged,
  emptyDescription,
}: FavoriteResourceTableProps) {
  const openInWorkspace = useOpenInWorkspace();
  const { list, total, page, pageSize, totalPage, loading, setPage, refresh } =
    useFavoriteResources(collectionId);
  const [unfavoriteItem, setUnfavoriteItem] = useState<FavoriteItem>();
  const [manageFavoriteItem, setManageFavoriteItem] = useState<FavoriteItem>();
  const [selectedResourceId, setSelectedResourceId] = useState<string>();
  const selectedItem = list.find((item) => item.resourceId === selectedResourceId);
  const selectedRow = selectedItem?.resourceInfo
    ? toFavoriteTableRow(selectedItem.resourceInfo)
    : undefined;

  const openResource = (item: FavoriteItem) => {
    if (!item.resourceInfo) return;
    openInWorkspace({
      resourceId: item.resourceId,
      resourceType: item.resourceInfo.resourceType,
      resourceName: item.resourceInfo.resourceName,
      driveLocation: { scope: buildDriveNodeScope() },
    });
  };

  const handleRowSelect = (item: FavoriteItem, _context: DataTableRowPressContext) => {
    setSelectedResourceId(item.resourceId);
  };

  const openSelectedResource = (node: DriveNode) => {
    if (node.type !== 'resource' && node.type !== 'link') return;
    openInWorkspace({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
      driveLocation: { scope: buildDriveNodeScope() },
    });
  };

  const handleRowAction = (item: FavoriteItem, key: string) => {
    if (key === 'open') {
      openResource(item);
      return;
    }
    if (key === 'manage') {
      if (item.resourceInfo) setManageFavoriteItem(item);
      return;
    }
    if (key === 'remove') {
      setUnfavoriteItem(item);
    }
  };

  const columns: DataTableColumn<FavoriteItem>[] = [
    {
      id: 'resource',
      label: '名称',
      width: 'fill',
      align: 'start',
      isRowHeader: true,
      className: styles.resourceNameColumn,
      renderCell: (item) => {
        if (!item.resourceInfo) {
          return (
            <span className={styles.resourceCellDisabled}>
              <EntryIcon entryType="resource" size={18} />
              <span>资源已删除</span>
            </span>
          );
        }
        const { resourceInfo } = item;
        return (
          <span className={styles.resourceCellButton}>
            <EntryIcon
              entryType="resource"
              resourceType={resourceInfo.resourceType}
              resourceName={resourceInfo.resourceName}
              resourceIconType={resourceInfo.resourceIconType}
              size={18}
            />
            <span className={styles.resourceCellName}>{resourceInfo.resourceName}</span>
          </span>
        );
      },
    },
    {
      id: 'type',
      label: '类型',
      width: 'md',
      renderCell: (item) => item.resourceInfo?.resourceType ?? '未知类型',
    },
    {
      id: 'favoritedAt',
      label: '收藏时间',
      width: 'md',
      renderCell: (item) => formatTimestampToDate(item.favoritedAt) || '—',
    },
    {
      id: 'unfavorite',
      label: '操作',
      width: 'sm',
      align: 'center',
      renderCell: (item) => {
        const actions: TableRowActionItem[] = [
          {
            key: 'open',
            label: '进入',
            disabled: !item.resourceInfo,
          },
          {
            key: 'manage',
            label: '管理收藏',
            disabled: !item.resourceInfo,
          },
          { key: 'remove', label: '移出收藏夹', variant: 'danger' },
        ];
        return (
          <TableRowActions
            ariaLabel={`${item.resourceInfo?.resourceName ?? '该资源'}操作`}
            actions={actions}
            onAction={(key) => handleRowAction(item, key)}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.resourceWorkspace}>
      <div className={styles.resourceTablePanel}>
        <header className={styles.resourcePanelHeader}>
          <div className={styles.resourcePanelCopy}>
            <h2 className={styles.resourcePanelTitle}>{collectionName}</h2>
            <p className={styles.resourcePanelDescription}>{collectionItemCount} 个内容</p>
          </div>
        </header>
        <DataTable
          ariaLabel="已收藏资源"
          items={list}
          rowKey="resourceId"
          selectedRowKey={selectedResourceId}
          onRowSelect={handleRowSelect}
          onRowActivate={openResource}
          columns={columns}
          loading={loading}
          emptyText="暂无收藏内容"
          emptyDescription={emptyDescription}
          totalCount={total}
          pagination={{
            total,
            current: page,
            pageSize,
            onChange: (nextPage) =>
              setPage(Math.min(Math.max(1, nextPage), Math.max(1, totalPage))),
          }}
          className={styles.resourceTable}
        />
      </div>
      <aside className={styles.detailPanel}>
        <TableDriveSelectionPanel
          mode="favorite"
          selectedRow={selectedRow}
          selectedCount={selectedRow ? 1 : 0}
          onEnter={() => undefined}
          onOpen={openSelectedResource}
          onRename={() => undefined}
          onMove={() => undefined}
          onDelete={() => undefined}
          onRemoveFavorite={() => {
            if (selectedItem) setUnfavoriteItem(selectedItem);
          }}
        />
      </aside>
      <UnfavoriteResourceModal
        item={unfavoriteItem}
        onOpenChange={(open) => {
          if (!open) setUnfavoriteItem(undefined);
        }}
        onSuccess={() => {
          setSelectedResourceId(undefined);
          void refresh();
          onCollectionChanged();
        }}
      />
      {manageFavoriteItem?.resourceInfo ? (
        <FavoriteCollectionPicker
          key={manageFavoriteItem.resourceId}
          resourceId={manageFavoriteItem.resourceId}
          onOpenChange={(open) => {
            if (!open) setManageFavoriteItem(undefined);
          }}
          onConfirmed={() => {
            setManageFavoriteItem(undefined);
            void refresh();
            onCollectionChanged();
          }}
        />
      ) : null}
    </div>
  );
}

export default FavoriteResourceTable;
