import type { InlineCommentItem } from '@/domains/InlineComment';

export interface NoteInlineCommentAnchor {
  start: string;
  end: string;
}

export interface NoteInlineCommentThread {
  threadId: string;
  resourceId: string;
  externalAnchorId: string;
  anchor: NoteInlineCommentAnchor;
  quoteText: string;
  items: InlineCommentItem[];
  createdAt: number;
  updatedAt: number;
}

export interface NoteInlineCommentDraft {
  anchor: NoteInlineCommentAnchor;
  quoteText: string;
}
