import { resolveResourceIconType, type ResourceItem } from '@/domains/Resource';
import type { TagTreeNode } from '@/domains/Tag';
import type {
  DriveNode,
  FolderNode,
  LinkNode,
  ResourceNode,
  RootNode,
} from '../entity/drive';

export const DRIVE_ROOT_ID = 'drive-root';

type EncodedNodeKind = 'folder' | 'resource' | 'link' | 'loading';

export type DecodedNodeId =
  | { kind: 'root' }
  | { kind: 'folder'; tagId: string }
  | { kind: 'resource'; resourceId: string; parentTagId: string }
  | { kind: 'link'; resourceId: string; parentTagId: string }
  | { kind: 'loading'; parentNodeId: string }
  | { kind: 'unknown'; raw: string };

const getFolderName = (tagName: string): string => {
  if (tagName === '/') return '根目录';
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
};

export const encodeNodeId = (kind: EncodedNodeKind, ...parts: string[]): string => {
  return [kind, ...parts].join(':');
};

export const decodeNodeId = (id: string): DecodedNodeId => {
  if (id === DRIVE_ROOT_ID) return { kind: 'root' };
  const [kind, ...parts] = id.split(':');
  if (kind === 'folder' && parts[0]) return { kind: 'folder', tagId: parts[0] };
  if (kind === 'resource' && parts[0] && parts[1]) {
    return { kind: 'resource', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'link' && parts[0] && parts[1]) {
    return { kind: 'link', resourceId: parts[0], parentTagId: parts[1] };
  }
  if (kind === 'loading' && parts[0]) return { kind: 'loading', parentNodeId: parts[0] };
  return { kind: 'unknown', raw: id };
};

export const mapTagToFolderNode = (tag: TagTreeNode, parentNodeId: string | null): FolderNode => {
  return {
    id: encodeNodeId('folder', tag.tagId),
    type: 'folder',
    parentId: parentNodeId,
    tagId: tag.tagId,
    name: getFolderName(tag.tagName),
    childrenIds: [],
  };
};

export const mapResourceItemToChildNode = (
  item: ResourceItem,
  parentTagId: string,
  parentNodeId: string
): ResourceNode | LinkNode => {
  const common = {
    parentId: parentNodeId,
    resourceId: item.resourceId,
    title: item.resourceName,
    resourceType: item.resourceType,
    resourceIconType:
      item.resourceIconType ??
      resolveResourceIconType({
        resourceType: item.resourceType,
        resourceName: item.resourceName,
      }),
    folderTagId: parentTagId,
  } as const;
  const isPrimaryMount = item.mainTagId == null || item.mainTagId === parentTagId;
  if (isPrimaryMount) {
    return {
      id: encodeNodeId('resource', item.resourceId, parentTagId),
      type: 'resource',
      ...common,
    };
  }
  return {
    id: encodeNodeId('link', item.resourceId, parentTagId),
    type: 'link',
    primaryTagId: item.mainTagId,
    ...common,
  };
};

export const buildLoadingNode = (parentNodeId: string, label?: string): DriveNode => {
  return {
    id: encodeNodeId('loading', parentNodeId),
    type: 'loading',
    parentId: parentNodeId,
    label,
  };
};

export const buildDriveRootNode = (params: {
  groupId?: string;
  personalRootTag?: TagTreeNode;
}): RootNode => {
  return {
    id: DRIVE_ROOT_ID,
    type: 'root',
    parentId: null,
    scope: params.groupId ? 'group' : 'personal',
    name: params.groupId ? '小组云盘' : '个人云盘',
    childrenIds: [],
  };
};

export const isContainerNode = (node: DriveNode): node is RootNode | FolderNode => {
  return node.type === 'root' || node.type === 'folder';
};
