import type {
  CreateNoteRequest,
  CreateNoteResponse,
  ForkNoteRequest,
  GetNoteInfoRequest,
  INoteService,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '@/domains/Note';
import { useResourceDisplayNameStore } from '@/domains/Resource/store/useResourceDisplayNameStore';

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  return {
    noteTitle: `笔记 ${params.resourceId}`,
    ownerId: 'u-1',
    authors: [{ id: 'u-1', name: '林知夏' }],
    lastEditedAtText: '2026-05-18 10:20:00',
    version: params.targetVersion ?? 1,
    canCollaborativeEdit: false,
    resourceInfo: {
      resourceId: params.resourceId,
      resourceName: `笔记 ${params.resourceId}`,
      ownerId: 'u-1',
      ownerInfo: {
        nickname: '林知夏',
        realName: '林知夏',
        avatar: '',
        identityType: 1,
      },
      resourceType: 'note',
      preview: '采访准备与选题 · 提问设计与追问技巧（mock 预览）。',
      likeCount: 28,
      favoriteCount: 9,
      commentCount: 3,
      marketSaleInfos: {
        'mg-1': {
          status: 'PUBLISHED',
          offerVersion: params.targetVersion ?? 1,
          reviewContentPercentage: 20,
          marketSaleTiers: [{ offerId: 'tier-note', price: 12 }],
        },
        'mg-news': {
          status: 'PUBLISHED',
          offerVersion: params.targetVersion ?? 1,
          reviewContentPercentage: 20,
          marketSaleTiers: [{ offerId: 'tier-note-2', price: 12 }],
        },
      },
    },
  };
};

const getDrawIoLatestSnapshot = async () => ({
  resourceId: '123',
  version: 0,
  fullSnapshot: null,
  deltas: null,
});

const saveDrawIoSnapshot = async (_params: SaveDrawIoSnapshotRequest): Promise<void> => {
  return Promise.resolve();
};

const forkNote = async (_params: ForkNoteRequest) => {
  return { resourceId: '124' };
};

const listNoteVersions = async () => ({
  list: [],
  total: 0,
  page: 1,
  size: 20,
  totalPage: 0,
});

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  getNoteInfoDisplay,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
};
