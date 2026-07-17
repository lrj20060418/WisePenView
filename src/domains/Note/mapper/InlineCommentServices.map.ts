import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { normalizeId } from '@/utils/normalize/normalizeId';
import { normalizeFiniteNumber } from '@/utils/normalize/normalizeNumber';
import type {
  AddInlineCommentApiRequest,
  CreateInlineCommentThreadApiRequest,
  InlineCommentChangesApiResponse,
  InlineCommentItemApi,
  InlineCommentThreadApi,
  ListInlineCommentThreadsApiRequest,
  ListInlineCommentThreadsApiResponse,
} from '../apis/InlineCommentApi.type';
import type {
  InlineComment,
  InlineCommentAuthor,
  InlineCommentThread,
  InlineCommentThreadList,
} from '../entity/inlineComment';
import type {
  AddInlineCommentRequest,
  CreateInlineCommentThreadRequest,
  InlineCommentChanges,
  ListInlineCommentThreadsRequest,
} from '../service/index.type';

function requiredId(value: string | undefined, field: string): string {
  const id = normalizeId(value);
  if (!id) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, { reason: `批注 ${field} 缺失` });
  }
  return id;
}

function mapTimestamp(value: number | string | undefined, field: string): number {
  const timestamp =
    normalizeFiniteNumber(value) ??
    (typeof value === 'string' && Number.isFinite(Date.parse(value))
      ? Date.parse(value)
      : undefined);
  if (timestamp === undefined) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `批注 ${field} 无效`,
    });
  }
  return timestamp;
}

function mapAuthor(authorId: string, author?: InlineCommentItemApi['author']): InlineCommentAuthor {
  return {
    id: requiredId(author?.id ?? authorId, '作者 ID'),
    name: author?.name?.trim() || requiredId(authorId, '作者'),
    avatar: author?.avatar?.trim() || undefined,
  };
}

function mapComment(item: InlineCommentItemApi): InlineComment {
  return {
    commentId: requiredId(item.commentId, 'commentId'),
    authorId: requiredId(item.authorId, 'authorId'),
    author: mapAuthor(item.authorId, item.author),
    content: item.content,
    createdAt: mapTimestamp(item.createdAt, 'createdAt'),
    revision: item.revision,
  };
}

function mapThread(data: InlineCommentThreadApi): InlineCommentThread {
  return {
    threadId: requiredId(data.threadId, 'threadId'),
    resourceId: requiredId(data.resourceId, 'resourceId'),
    anchor: {
      start: data.anchor.start,
      end: data.anchor.end,
    },
    quoteText: data.quoteText,
    items: data.items.map(mapComment),
    revision: data.revision,
    createdAt: mapTimestamp(data.createdAt, 'createdAt'),
    updatedAt: mapTimestamp(data.updatedAt ?? data.createdAt, 'updatedAt'),
  };
}

const mapCreateThreadRequest = (
  params: CreateInlineCommentThreadRequest
): CreateInlineCommentThreadApiRequest => ({
  resourceId: params.resourceId,
  idempotencyKey: params.idempotencyKey,
  anchor: params.anchor,
  quoteText: params.quoteText,
  content: params.content,
});

const mapAddCommentRequest = (params: AddInlineCommentRequest): AddInlineCommentApiRequest => ({
  idempotencyKey: params.idempotencyKey,
  content: params.content,
});

const mapListThreadsRequest = (
  params: ListInlineCommentThreadsRequest
): ListInlineCommentThreadsApiRequest => ({ resourceId: params.resourceId });

const mapThreadsFromApi = (data: ListInlineCommentThreadsApiResponse): InlineCommentThreadList => ({
  items: data.items.map(mapThread),
  cursor: data.cursor ?? undefined,
});

const mapChangesFromApi = (data: InlineCommentChangesApiResponse): InlineCommentChanges => ({
  items: data.items.map((item) => ({
    threadId: requiredId(item.threadId, 'threadId'),
    revision: item.revision,
  })),
  cursor: data.cursor ?? undefined,
});

export const InlineCommentServicesMap = {
  mapCreateThreadRequest,
  mapAddCommentRequest,
  mapListThreadsRequest,
  mapComment,
  mapThread,
  mapThreadsFromApi,
  mapChangesFromApi,
};
