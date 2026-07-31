import type { TagTreeNode } from '@/domains/Tag';

const TRASH_TAG_NAME = '.Trash';
const HIDDEN_TAG_PREFIX = '.';

/** 展示名：去掉路径标签前导 `/` */
export function marketFolderDisplayName(tagName: string): string {
  if (tagName === '/') return '';
  if (tagName.startsWith('/')) return tagName.slice(1);
  return tagName;
}

export function isVisibleMarketFolderTag(node: TagTreeNode): boolean {
  const name = (node.tagName ?? '').trim();
  if (name === TRASH_TAG_NAME) return false;
  return !name.startsWith(HIDDEN_TAG_PREFIX);
}

export function getVisibleMarketFolderChildren(node: TagTreeNode | undefined): TagTreeNode[] {
  return (node?.children ?? []).filter(isVisibleMarketFolderTag);
}

export function isMarketFolderLeaf(node: TagTreeNode | undefined): boolean {
  return getVisibleMarketFolderChildren(node).length === 0;
}

/** 从当前节点向上拼面包屑（不含组根） */
export function buildMarketFolderBreadcrumb(
  folderId: string,
  getById: (tagId: string) => TagTreeNode | undefined
): TagTreeNode[] {
  const chain: TagTreeNode[] = [];
  let current = getById(folderId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? getById(current.parentId) : undefined;
  }
  return chain;
}

/** 扁平化可见叶子文件夹，供发布页选择挂载标签 */
export function flattenVisibleMarketFolders(
  roots: TagTreeNode[]
): Array<{ tagId: string; label: string }> {
  const out: Array<{ tagId: string; label: string }> = [];
  const walk = (node: TagTreeNode, path: string[]) => {
    if (!isVisibleMarketFolderTag(node)) return;
    const name = marketFolderDisplayName(node.tagName ?? '') || node.tagName || node.tagId;
    const nextPath = [...path, name];
    const children = getVisibleMarketFolderChildren(node);
    if (children.length === 0) {
      out.push({ tagId: node.tagId, label: nextPath.join(' / ') });
      return;
    }
    children.forEach((child) => walk(child, nextPath));
  };
  roots.forEach((root) => walk(root, []));
  return out;
}
