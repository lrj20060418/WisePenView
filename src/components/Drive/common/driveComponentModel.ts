import type { DriveNode, LoadingNode } from '@/domains/Drive';

export const DEFAULT_DRIVE_ROOT_ID = 'drive-root';

export type DriveScope = { type: 'personal' } | { type: 'group'; groupId: string };

export type DriveItemKind = 'root' | 'folder' | 'resource' | 'link';

export type DriveDataNode = Exclude<DriveNode, LoadingNode>;

export type DriveActionTarget = Extract<DriveNode, { type: 'folder' | 'resource' | 'link' }>;

export interface DriveSelectionItem {
  nodeId: string;
  kind: DriveItemKind;
  label: string;
  parentNodeId: string | null;
  resourceId?: string;
  tagId?: string;
}

export const resolveDriveScope = (scope?: DriveScope, fallbackGroupId?: string) => {
  const groupId = scope?.type === 'group' ? scope.groupId : fallbackGroupId;
  return {
    rootId: DEFAULT_DRIVE_ROOT_ID,
    groupId,
  };
};

export const getDriveNodeLabel = (node: DriveNode): string => {
  switch (node.type) {
    case 'root':
      return node.name || '云盘';
    case 'folder':
      return node.name || '未命名文件夹';
    case 'resource':
    case 'link':
      return node.title || '未命名文件';
    case 'loading':
      return '';
  }
};

export const isDriveActionTarget = (node: DriveNode): node is DriveActionTarget =>
  node.type === 'folder' || node.type === 'resource' || node.type === 'link';

export const toDriveSelectionItem = (node: DriveNode): DriveSelectionItem | null => {
  if (node.type === 'loading') return null;
  if (node.type === 'root') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
    };
  }
  if (node.type === 'folder') {
    return {
      nodeId: node.id,
      kind: node.type,
      label: getDriveNodeLabel(node),
      parentNodeId: node.parentId,
      tagId: node.tagId,
    };
  }
  return {
    nodeId: node.id,
    kind: node.type,
    label: getDriveNodeLabel(node),
    parentNodeId: node.parentId,
    resourceId: node.resourceId,
  };
};
