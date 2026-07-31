import { FolderTable, type FolderTableColumn, type FolderTableRow } from '@/components/Table';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { MarketResourceTableItem, MarketResourceTableProps } from './index.type';
import styles from './style.module.less';

interface MarketResourceTableRow extends FolderTableRow {
  item: MarketResourceTableItem;
}

function isNoteLike(resourceType?: string): boolean {
  const lower = (resourceType ?? '').toLowerCase();
  return lower === 'note' || lower === 'drawio';
}

function MarketResourceTable({
  items,
  onOpen,
  ariaLabel,
  className,
  loading = false,
  totalCount,
  loadMore,
  emptyText,
  emptyDescription,
}: MarketResourceTableProps) {
  const { t } = useTranslation('market');

  const columns: FolderTableColumn<MarketResourceTableRow>[] = [
    {
      id: 'resource',
      label: t('page.folderTable.name'),
      width: 'fill',
      isNameColumn: true,
      className: styles.nameColumn,
    },
    {
      id: 'type',
      label: t('page.folderTable.type'),
      width: 'folderType',
      renderCell: (row) => {
        const key = isNoteLike(row.item.resourceType) ? 'NOTE' : 'DOCUMENT';
        return t(`page.resourceType.${key}`);
      },
    },
    {
      id: 'owner',
      label: t('page.folderTable.owner'),
      width: 'folderType',
      renderCell: (row) => row.item.ownerLabel || '—',
    },
    {
      id: 'price',
      label: t('page.folderTable.price'),
      width: 'folderType',
      renderCell: (row) => t('page.price', { price: row.item.price }),
    },
  ];

  const rows: MarketResourceTableRow[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    entryType: 'resource',
    resourceType: item.resourceType,
    resourceIconType: item.resourceIconType,
    typeLabel: item.resourceType ?? '',
    item,
  }));

  return (
    <div className={clsx(styles.panel, className)}>
      <FolderTable<MarketResourceTableRow>
        ariaLabel={ariaLabel ?? t('page.folderTable.aria')}
        items={rows}
        columns={columns}
        loading={loading}
        totalCount={totalCount}
        loadMore={loadMore}
        emptyText={emptyText}
        emptyDescription={emptyDescription}
        onRowActivate={(row) => onOpen(row.item)}
        className={styles.table}
      />
    </div>
  );
}

export default MarketResourceTable;
