import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TableSortColumnLabelProps, TableSortIndicatorProps } from './index.type';
import styles from './style.module.less';

const ARROW_SIZE = 12;

function TableSortIndicator({ direction }: TableSortIndicatorProps) {
  return (
    <span className={styles.indicator} aria-hidden>
      <ChevronUp
        size={ARROW_SIZE}
        className={direction === 'ascending' ? styles.arrowActive : styles.arrowInactive}
      />
      <ChevronDown
        size={ARROW_SIZE}
        className={direction === 'descending' ? styles.arrowActive : styles.arrowInactive}
      />
    </span>
  );
}

function TableSortColumnLabel({ label, columnId, sortDescriptor }: TableSortColumnLabelProps) {
  const isSorted = sortDescriptor?.column === columnId;

  return (
    <span className={styles.headerInner}>
      <span className={styles.label}>{label}</span>
      <TableSortIndicator direction={isSorted ? sortDescriptor?.direction : undefined} />
    </span>
  );
}

export { TableSortColumnLabel, TableSortIndicator };
