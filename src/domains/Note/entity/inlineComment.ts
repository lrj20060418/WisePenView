export interface NoteInlineCommentAnchor {
  start: string;
  end: string;
}

export interface NoteInlineCommentAuthor {
  id: string;
  name: string;
  avatar?: string;
}

export interface NoteInlineComment {
  commentId: string;
  authorId: string;
  author: NoteInlineCommentAuthor;
  content: string;
  createdAt: number;
}

export interface NoteInlineCommentThread {
  threadId: string;
  resourceId: string;
  externalAnchorId: string;
  anchor: NoteInlineCommentAnchor;
  quoteText: string;
  items: NoteInlineComment[];
  createdAt: number;
  updatedAt: number;
}

export interface NoteInlineCommentDraft {
  anchor: NoteInlineCommentAnchor;
  quoteText: string;
}
