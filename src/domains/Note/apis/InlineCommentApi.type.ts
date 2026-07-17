export interface InlineCommentAnchorApi {
  start: string;
  end: string;
}

export interface InlineCommentAuthorApi {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface InlineCommentItemApi {
  commentId: string;
  authorId: string;
  author?: InlineCommentAuthorApi | null;
  content: string;
  createdAt: number | string;
  revision: number;
}

export interface InlineCommentThreadApi {
  threadId: string;
  resourceId: string;
  anchor: InlineCommentAnchorApi;
  quoteText: string;
  items: InlineCommentItemApi[];
  revision: number;
  createdAt: number | string;
  updatedAt?: number | string;
}

export interface CreateInlineCommentThreadApiRequest {
  resourceId: string;
  idempotencyKey: string;
  anchor: InlineCommentAnchorApi;
  quoteText: string;
  content: string;
}

export interface AddInlineCommentApiRequest {
  idempotencyKey: string;
  content: string;
}

export interface ListInlineCommentThreadsApiRequest {
  resourceId: string;
}

export interface GetInlineCommentChangesApiRequest {
  resourceId: string;
  cursor?: string;
}

export interface InlineCommentChangeApi {
  threadId: string;
  revision: number;
}

export interface InlineCommentChangesApiResponse {
  items: InlineCommentChangeApi[];
  cursor?: string | null;
}

export interface ListInlineCommentThreadsApiResponse {
  items: InlineCommentThreadApi[];
  cursor?: string | null;
}
