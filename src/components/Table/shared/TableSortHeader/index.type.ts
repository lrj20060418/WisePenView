import type { SortDescriptor } from '@heroui/react';
import type { ReactNode } from 'react';

export interface TableSortIndicatorProps {
  direction?: SortDescriptor['direction'];
}

export interface TableSortColumnLabelProps {
  label: ReactNode;
  columnId: string;
  sortDescriptor?: SortDescriptor;
}
