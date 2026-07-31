import type { TagTreeNode } from '@/domains/Tag';

export interface MarketFolderCardProps {
  folder: TagTreeNode;
  displayName: string;
  itemCountLabel?: string;
  onOpen: (folder: TagTreeNode) => void;
}
