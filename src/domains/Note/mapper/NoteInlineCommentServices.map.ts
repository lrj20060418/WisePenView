import type {
  AddInlineCommentItemRequest,
  CreateInlineCommentRequest,
  InlineCommentThread,
} from '@/domains/InlineComment';

import type { NoteInlineCommentDraft, NoteInlineCommentThread } from '../entity/inlineComment';

function mapThread(thread: InlineCommentThread): NoteInlineCommentThread | null {
  const start = thread.anchor.anchorPayload.start;
  const end = thread.anchor.anchorPayload.end;
  if (typeof start !== 'string' || typeof end !== 'string' || !start || !end) {
    return null;
  }
  return {
    threadId: thread.inlineCommentId,
    resourceId: thread.resourceId,
    externalAnchorId: thread.anchor.externalAnchorId,
    anchor: { start, end },
    quoteText: thread.anchor.quoteText,
    items: thread.items,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

const mapThreads = (threads: InlineCommentThread[]): NoteInlineCommentThread[] =>
  threads.flatMap((thread) => {
    const mapped = mapThread(thread);
    return mapped ? [mapped] : [];
  });

const mapCreateRequest = (params: {
  resourceId: string;
  requestKey: string;
  draft: NoteInlineCommentDraft;
  content: string;
  imageUrls: string[];
}): CreateInlineCommentRequest => ({
  resourceId: params.resourceId,
  externalAnchorId: params.requestKey,
  quoteText: params.draft.quoteText,
  anchorPayload: {
    start: params.draft.anchor.start,
    end: params.draft.anchor.end,
  },
  content: params.content,
  imageUrls: params.imageUrls,
  mentionUserIds: [],
});

const mapAddItemRequest = (params: {
  resourceId: string;
  threadId: string;
  content: string;
  imageUrls: string[];
}): AddInlineCommentItemRequest => ({
  resourceId: params.resourceId,
  inlineCommentId: params.threadId,
  content: params.content,
  imageUrls: params.imageUrls,
  mentionUserIds: [],
});

export const NoteInlineCommentServicesMap = {
  mapThreads,
  mapCreateRequest,
  mapAddItemRequest,
};
