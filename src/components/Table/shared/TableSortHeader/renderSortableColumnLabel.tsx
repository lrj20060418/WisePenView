import { TableSortColumnLabel } from './index';
import type { TableSortColumnLabelProps } from './index.type';

export function renderSortableColumnLabel(
  label: TableSortColumnLabelProps['label'],
  columnId: string,
  sortDescriptor: TableSortColumnLabelProps['sortDescriptor'],
  allowsSorting?: boolean
) {
  if (!allowsSorting) {
    return label;
  }
  return <TableSortColumnLabel label={label} columnId={columnId} sortDescriptor={sortDescriptor} />;
}
