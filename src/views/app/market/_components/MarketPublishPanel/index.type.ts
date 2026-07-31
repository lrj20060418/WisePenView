import type { MarketPublishDraft } from '../../mockData';

export interface MarketPublishGroupOption {
  groupId: string;
  groupName: string;
}

export interface MarketPublishFolderOption {
  tagId: string;
  label: string;
}

export interface MarketPublishPanelProps {
  mode?: 'create' | 'edit';
  draft: MarketPublishDraft;
  previewOwnerName: string;
  previewCollege: string;
  marketGroups: MarketPublishGroupOption[];
  folderOptions: MarketPublishFolderOption[];
  groupsLoading?: boolean;
  foldersLoading?: boolean;
  labels: {
    back: string;
    pageTitle: string;
    pageSubtitle: string;
    formTitle: string;
    uploadFile: string;
    uploadFileHint: string;
    price: string;
    coinSuffix: string;
    marketGroupId: string;
    folderTagId: string;
    pickGroupFirst: string;
    noGroups: string;
    noFolders: string;
    loadingGroups: string;
    loadingFolders: string;
    saveDraft: string;
    submit: string;
    previewTitle: string;
    previewEmptyTitle: string;
  };
  submitting?: boolean;
  onBack: () => void;
  onChange: (next: MarketPublishDraft) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}
