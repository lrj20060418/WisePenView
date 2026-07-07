import type { DriveNode } from '@/domains/Drive';
import type { DriveTableRow } from '../../index.type';

export interface TableDriveSelectionPanelProps {
  selectedRow?: DriveTableRow;
  batchEditMode?: boolean;
  batchSelectedCount?: number;
  groupId?: string;
  canManageTagPermission?: boolean;
  tagPermissionRefreshToken?: number;
  onEnter: (nodeId: string) => void;
  onOpen: (node: DriveNode) => void;
  onManageTagPermission?: (tagId: string) => void;
  onClear: () => void;
  onRefresh: () => void;
}
