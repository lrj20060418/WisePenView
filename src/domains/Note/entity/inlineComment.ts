export interface InlineCommentAnchor {
  start: string;
  end: string;
}

export interface InlineCommentAuthor {
  id: string;
  name: string;
  avatar?: string;
}

export interface InlineComment {
  commentId: string;
  authorId: string;
  author: InlineCommentAuthor;
  content: string;
  createdAt: number;
  revision: number;
}

export interface InlineCommentThread {
  threadId: string;
  resourceId: string;
  anchor: InlineCommentAnchor;
  quoteText: string;
  items: InlineComment[];
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface InlineCommentThreadList {
  items: InlineCommentThread[];
  cursor?: string;
}

export interface InlineCommentDraft {
  anchor: InlineCommentAnchor;
  quoteText: string;
}
