import type { ResourceIconType } from '@/domains/Resource';

export type DriveNodeType = 'root' | 'folder' | 'resource' | 'link' | 'loading';

interface DriveNodeBase {
  /** 此处 id 由 service 分配，用于在 service 中查找节点 */
  id: string;
  parentId: string | null;
}

interface RootNode extends DriveNodeBase {
  type: 'root';
  name: string;
  scope: 'personal' | 'group';
  childrenIds: string[];
}

interface FolderNode extends DriveNodeBase {
  type: 'folder';
  tagId: string;
  name: string;
  childrenIds: string[];
}

interface DriveResourceNodeBase extends DriveNodeBase {
  resourceId: string;
  title: string;
  resourceType?: string;
  resourceIconType: ResourceIconType;
  /** 当前节点所在目录 tag，用来描述资源是主挂载还是辅助挂载 */
  folderTagId: string;
}

interface ResourceNode extends DriveResourceNodeBase {
  type: 'resource';
}

interface LinkNode extends DriveResourceNodeBase {
  type: 'link';
  /** 资源主挂载 tag；后端未返回有序 tag 时允许为空 */
  primaryTagId?: string;
}

/** 加载占位节点：仅用于组件展示当前目录正在拉取子节点，不代表真实文件或文件夹 */
interface LoadingNode extends DriveNodeBase {
  type: 'loading';
  parentId: string;
  label?: string;
}

export type DriveNode = RootNode | FolderNode | ResourceNode | LinkNode | LoadingNode;
export type { FolderNode, LinkNode, LoadingNode, ResourceNode, RootNode };
