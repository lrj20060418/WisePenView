import { apiGet, apiPost } from '@/apis/request';

import type {
  AddInlineCommentApiRequest,
  CreateInlineCommentThreadApiRequest,
  GetInlineCommentChangesApiRequest,
  InlineCommentChangesApiResponse,
  InlineCommentThreadApi,
  ListInlineCommentThreadsApiRequest,
  ListInlineCommentThreadsApiResponse,
} from './InlineCommentApi.type';

const createThread = (req: CreateInlineCommentThreadApiRequest): Promise<InlineCommentThreadApi> =>
  apiPost('/threads', req);

const addComment = (
  threadId: string,
  req: AddInlineCommentApiRequest
): Promise<InlineCommentThreadApi['items'][number]> =>
  apiPost(`/threads/${encodeURIComponent(threadId)}/comments`, req);

const listThreads = (
  req: ListInlineCommentThreadsApiRequest
): Promise<ListInlineCommentThreadsApiResponse> => apiGet('/threads', { params: req });

const getThread = (threadId: string): Promise<InlineCommentThreadApi> =>
  apiGet(`/threads/${encodeURIComponent(threadId)}`);

const getComment = (
  threadId: string,
  commentId: string
): Promise<InlineCommentThreadApi['items'][number]> =>
  apiGet(`/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(commentId)}`);

const getChanges = (
  req: GetInlineCommentChangesApiRequest
): Promise<InlineCommentChangesApiResponse> => apiGet('/threads/changes', { params: req });

export const InlineCommentApi = {
  createThread,
  addComment,
  listThreads,
  getThread,
  getComment,
  getChanges,
};
