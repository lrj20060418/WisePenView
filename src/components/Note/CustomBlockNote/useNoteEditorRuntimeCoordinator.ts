import { useMount, useUpdateEffect } from 'ahooks';

import type { CustomBlockNoteProps } from './index.type';
import type { CustomBlockNoteEditor } from './noteEditorComposition';
import {
  useNoteAiDiff,
  useNoteCollaboration,
  useNoteDocument,
  useNoteEditorCommands,
  useNoteEditorHydration,
  useNoteInlineComment,
  type NoteEditorDefinition,
} from './runtime';

function useBindNoteEditor(editor: CustomBlockNoteEditor, definition: NoteEditorDefinition): void {
  useMount(() => {
    definition.setEditor(editor);
  });

  useUpdateEffect(() => {
    definition.setEditor(editor);
  }, [editor]);
}

export function useNoteEditorRuntimeCoordinator({
  editor,
  definition,
  props,
}: {
  editor: CustomBlockNoteEditor;
  definition: NoteEditorDefinition;
  props: CustomBlockNoteProps;
}) {
  const {
    resourceId,
    collaboration: collaborationBinding,
    state: { aiDiffDisplayMode, readOnly, blockLocalDocWrites },
    aiDiffPreview,
    inlineComment: inlineCommentConfig,
    onOutlineChange,
    onActiveHeadingChange,
    onAiDiffPresenceChange,
    onAskAi,
    onAiDiffBodyContentHashChange,
  } = props;
  useBindNoteEditor(editor, definition);

  const collaboration = useNoteCollaboration({
    editor,
    definition,
    collaboration: collaborationBinding,
    readOnly,
  });

  const aiDiff = useNoteAiDiff({
    editor,
    definition,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    aiDiffDisplayMode,
    readOnly,
    blockLocalDocWrites,
    onPresenceChange: onAiDiffPresenceChange,
  });

  const document = useNoteDocument({
    editor,
    definition,
    resourceId,
    blockLocalDocWrites,
    onOutlineChange,
    onActiveHeadingChange,
    onAskAi,
    onAiDiffBodyContentHashChange,
  });

  useNoteEditorHydration({
    editor,
    doc: collaborationBinding.doc,
    undoManager: collaboration.undoManager,
    resourceId,
    collaborationReady: collaborationBinding.ready,
    aiDiffPreview,
    scheduleBodyContentHashRefresh: document.scheduleBodyContentHashRefresh,
  });
  const inlineComment = useNoteInlineComment({
    editor,
    definition,
    collaboration: collaborationBinding,
    inlineComment: inlineCommentConfig,
    readOnly,
  });

  const commands = useNoteEditorCommands(editor, aiDiff.setExportDisplayModeOverride);

  return {
    collaboration,
    document: {
      ...document,
      handleSelectionChange: () => document.handleSelectionChange(inlineComment.captureSelection),
    },
    aiDiff,
    inlineComment,
    commands,
  };
}

export type NoteEditorRuntimeCoordinator = ReturnType<typeof useNoteEditorRuntimeCoordinator>;
