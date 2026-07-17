import type {
  AddInlineCommentRequest,
  CreateInlineCommentThreadRequest,
  CreateNoteRequest,
  CreateNoteResponse,
  ForkNoteRequest,
  GetInlineCommentChangesRequest,
  GetInlineCommentRequest,
  GetInlineCommentThreadRequest,
  GetNoteInfoRequest,
  InlineComment,
  InlineCommentChanges,
  InlineCommentThread,
  InlineCommentThreadList,
  INoteService,
  ListInlineCommentThreadsRequest,
  NoteInfoDisplayData,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from '@/domains/Note';
import { useResourceDisplayNameStore } from '@/domains/Resource/store/useResourceDisplayNameStore';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { NOTE_AI_DIFF_PREVIEW_MOCK } from './aiDiffPreview.mockdata';

/** Mock 占位：与实现层一致，同步更新展示名 store */
const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
  useResourceDisplayNameStore.getState().setDisplayName(params.resourceId, params.newName);
  return Promise.resolve();
};

const createNote = async (_params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  return { resourceId: '123' };
};

const getNoteInfoDisplay = async (_params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  return {
    noteTitle: 'AI Diff 样式预览',
    authors: [],
    lastEditedAtText: '暂无',
    version: 0,
    canCollaborativeEdit: true,
    aiDiffPreview: NOTE_AI_DIFF_PREVIEW_MOCK,
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

const inlineCommentThreads = new Map<string, InlineCommentThread>();
const inlineCommentIdempotency = new Map<string, string>();

const createMockComment = (content: string, revision: number): InlineComment => ({
  commentId: `mock-comment-${crypto.randomUUID()}`,
  authorId: 'mock-current-user',
  author: { id: 'mock-current-user', name: '当前用户' },
  content,
  createdAt: Date.now(),
  revision,
});

const createInlineCommentThread = async (
  params: CreateInlineCommentThreadRequest
): Promise<InlineCommentThread> => {
  const existingThreadId = inlineCommentIdempotency.get(params.idempotencyKey);
  const existingThread = existingThreadId ? inlineCommentThreads.get(existingThreadId) : undefined;
  if (existingThread) return existingThread;

  const createdAt = Date.now();
  const thread: InlineCommentThread = {
    threadId: `mock-thread-${crypto.randomUUID()}`,
    resourceId: params.resourceId,
    anchor: params.anchor,
    quoteText: params.quoteText,
    items: [createMockComment(params.content, 1)],
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  };
  inlineCommentThreads.set(thread.threadId, thread);
  inlineCommentIdempotency.set(params.idempotencyKey, thread.threadId);
  return thread;
};

const addInlineComment = async (params: AddInlineCommentRequest): Promise<InlineComment> => {
  const thread = inlineCommentThreads.get(params.threadId);
  if (!thread) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  const comment = createMockComment(params.content, thread.revision + 1);
  inlineCommentThreads.set(params.threadId, {
    ...thread,
    items: [...thread.items, comment],
    revision: comment.revision,
    updatedAt: comment.createdAt,
  });
  return comment;
};

const listInlineCommentThreads = async (
  params: ListInlineCommentThreadsRequest
): Promise<InlineCommentThreadList> => ({
  items: [...inlineCommentThreads.values()].filter(
    (thread) => thread.resourceId === params.resourceId
  ),
  cursor: 'mock-cursor',
});

const getInlineCommentThread = async (
  params: GetInlineCommentThreadRequest
): Promise<InlineCommentThread> => {
  const thread = inlineCommentThreads.get(params.threadId);
  if (!thread) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  return thread;
};

const getInlineComment = async (params: GetInlineCommentRequest): Promise<InlineComment> => {
  const thread = await getInlineCommentThread(params);
  const comment = thread.items.find((item) => item.commentId === params.commentId);
  if (!comment) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERACT_COMMENT_NOT_FOUND);
  }
  return comment;
};

const getInlineCommentChanges = async (
  _params: GetInlineCommentChangesRequest
): Promise<InlineCommentChanges> => ({ items: [], cursor: 'mock-cursor' });

export const NoteServicesMock: INoteService = {
  syncTitle,
  createNote,
  getNoteInfoDisplay,
  getDrawIoLatestSnapshot,
  saveDrawIoSnapshot,
  forkNote,
  listNoteVersions,
  createInlineCommentThread,
  addInlineComment,
  listInlineCommentThreads,
  getInlineCommentThread,
  getInlineComment,
  getInlineCommentChanges,
};
