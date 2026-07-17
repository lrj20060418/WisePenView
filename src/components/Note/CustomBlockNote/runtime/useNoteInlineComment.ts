import { useMount, useUpdateEffect } from 'ahooks';

import {
  capturePendingInlineCommentSelection,
  isInlineCommentableSelection,
  syncDomSelectionToProseMirror,
  useContentInlineComments,
  useSyncInlineCommentDocumentMarks,
} from '../engines/inlineComment';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';
import type { NoteEditorDefinition } from './useNoteEditorDefinition';

export function useNoteInlineComment({
  editor,
  definition,
  collaboration: { doc, provider },
  inlineComment: {
    usersById,
    visibilityPrivileged: isVisibilityPrivileged,
    collaboratorVisibility,
    onOpen,
    history,
  },
  readOnly,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  collaboration: CustomBlockNoteProps['collaboration'];
  inlineComment: CustomBlockNoteProps['inlineComment'];
  readOnly: boolean;
}) {
  const {
    enabled,
    uiEnabled,
    writable,
    activeUserId,
    activeUsername,
    activeAvatarUrl,
    pendingReferenceRef,
    pendingSelectionRef,
    commitPendingReferenceForThreadRef,
  } = definition.inlineComment;
  const {
    contextValue,
    rememberPendingInlineCommentReference,
    commitPendingInlineCommentReferenceForThread,
    bumpInlineCommentState,
    visibleThreadReferenceTexts,
    inlineCommentThreadPositions,
  } = useContentInlineComments({
    editor,
    doc,
    registry: notePluginRegistry,
    inlineCommentEnabled: enabled,
    inlineCommentWritable: writable,
    readOnly,
    inlineCommentUserId: activeUserId,
    isInlineCommentVisibilityPrivileged: isVisibilityPrivileged,
    collaboratorVisibility,
    pendingInlineCommentReferenceRef: pendingReferenceRef,
    pendingInlineCommentSelectionRef: pendingSelectionRef,
    onOpenInlineComment: onOpen,
  });

  useMount(() => {
    commitPendingReferenceForThreadRef.current = commitPendingInlineCommentReferenceForThread;
  });

  useUpdateEffect(() => {
    commitPendingReferenceForThreadRef.current = commitPendingInlineCommentReferenceForThread;
  }, [commitPendingInlineCommentReferenceForThread]);

  useSyncInlineCommentDocumentMarks({
    editor,
    registry: notePluginRegistry,
    doc,
    provider,
    inlineCommentEnabled: enabled,
    inlineCommentUserId: activeUserId,
    isInlineCommentVisibilityPrivileged: isVisibilityPrivileged,
    collaboratorVisibility,
    onAfterDocumentMarksSync: bumpInlineCommentState,
  });

  const captureSelection = () => {
    if (!enabled || !writable || !isInlineCommentableSelection(editor, notePluginRegistry)) {
      return;
    }
    const selection = capturePendingInlineCommentSelection(editor);
    if (selection) {
      pendingSelectionRef.current = selection;
    }
  };

  return {
    uiEnabled,
    writable,
    contextValue,
    captureSelection,
    rememberPendingReference: () => {
      syncDomSelectionToProseMirror(editor);
      rememberPendingInlineCommentReference();
    },
    ui: {
      inlineCommentUserId: activeUserId,
      inlineCommentUsername: activeUsername,
      inlineCommentAvatarUrl: activeAvatarUrl,
      inlineCommentUsersById: usersById,
      isInlineCommentVisibilityPrivileged: isVisibilityPrivileged,
      collaboratorVisibility,
      inlineCommentHistoryOpen: history.open,
      onInlineCommentHistoryOpenChange: history.onOpenChange,
      localThreadReferenceTexts: visibleThreadReferenceTexts,
      inlineCommentThreadPositions,
      onBumpInlineCommentSidebar: bumpInlineCommentState,
    },
  };
}
