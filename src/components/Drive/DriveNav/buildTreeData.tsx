import type { DataNode } from '@/components/Tree';
import type { DriveNode } from '@/domains/Drive';
import DriveTreeNodeTitle from './DriveTreeNodeTitle';

interface BuildTreeDataOptions {
  renderableTypes: Set<'root' | 'folder' | 'resource' | 'link'>;
  selectableTypes: Set<'root' | 'folder' | 'resource' | 'link'>;
  disabledNodeIds: Set<string>;
}

export function buildDriveTreeData(
  nodes: DriveNode[],
  options: BuildTreeDataOptions,
  nodeMap: Map<string, DriveNode>
): DataNode[] {
  const result: DataNode[] = [];
  for (const node of nodes) {
    if (node.type !== 'loading' && !options.renderableTypes.has(node.type)) continue;
    nodeMap.set(node.id, node);
    result.push(toTreeDataNode(node, options));
  }
  return result;
}

export function replaceTreeNodeChildren(
  nodes: DataNode[],
  targetKey: string,
  children: DataNode[]
): DataNode[] {
  return nodes.map((node) => {
    if (String(node.key) === targetKey) {
      return { ...node, children };
    }
    if (!node.children || node.children.length === 0) return node;
    return {
      ...node,
      children: replaceTreeNodeChildren(node.children, targetKey, children),
    };
  });
}

function toTreeDataNode(node: DriveNode, options: BuildTreeDataOptions): DataNode {
  if (node.type === 'loading') {
    return {
      key: node.id,
      title: <DriveTreeNodeTitle node={node} />,
      selectable: false,
      checkable: false,
      isLeaf: true,
    };
  }

  const selectable = options.selectableTypes.has(node.type);
  const disabled = options.disabledNodeIds.has(node.id);
  const title = <DriveTreeNodeTitle node={node} />;

  if (node.type === 'root' || node.type === 'folder') {
    return {
      key: node.id,
      title,
      selectable: selectable && !disabled,
      checkable: selectable && !disabled,
      disabled,
      isLeaf: false,
    };
  }

  return {
    key: node.id,
    title,
    selectable: selectable && !disabled,
    checkable: selectable && !disabled,
    disabled,
    isLeaf: true,
  };
}
