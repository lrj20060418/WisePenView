/* eslint-disable react-refresh/only-export-components -- Provider 与读取 hook 必须共享同一个批注 Context。 */
import { createContext, createElement, use, type ReactNode } from 'react';

import type { NoteInlineCommentAnchor } from '../../../content/types';
import type { CustomBlockNoteEditor } from '../../../noteEditorComposition';

export interface ContentInlineCommentTarget {
  ownerId: string;
  anchor: NoteInlineCommentAnchor;
}

export interface StartContentInlineCommentOptions extends ContentInlineCommentTarget {
  referenceText: string;
}

export interface UpdateContentInlineCommentReferenceOptions extends ContentInlineCommentTarget {
  referenceText: string;
  persist?: boolean;
}

export interface NoteInlineCommentContextValue {
  canInlineComment: boolean;
  startContentInlineComment: (options: StartContentInlineCommentOptions) => void;
  updateContentInlineCommentReference: (
    options: UpdateContentInlineCommentReferenceOptions
  ) => void;
  clearContentInlineCommentReferenceOverride: (target: ContentInlineCommentTarget) => void;
  selectedThreadId?: string;
  editor: CustomBlockNoteEditor;
  hasActiveContentInlineComment: (target: ContentInlineCommentTarget) => boolean;
  isContentThreadSelected: (target: ContentInlineCommentTarget) => boolean;
  getThreadContentInlineCommentAnchor: (threadId: string) => ContentInlineCommentTarget | undefined;
}

const NoteInlineCommentContext = createContext<NoteInlineCommentContextValue | null>(null);

export function NoteInlineCommentProvider({
  children,
  ...value
}: NoteInlineCommentContextValue & { children: ReactNode }) {
  return createElement(NoteInlineCommentContext.Provider, { value }, children);
}

export function useNoteInlineCommentContext() {
  return use(NoteInlineCommentContext);
}
