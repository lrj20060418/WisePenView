import { usePendingNoteImportStore } from '@/components/Note/_store/usePendingNoteImportStore';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUpdateEffect } from 'ahooks';
import type * as Y from 'yjs';

import { initializeAiDiffPreview } from '../engines/aiDiff/preview';
import { importNoteMarkdown } from '../engines/markdown/markdownImport';
import type { CustomBlockNoteProps } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';

export function useNoteEditorHydration({
  editor,
  doc,
  undoManager,
  resourceId,
  collaborationReady,
  aiDiffPreview,
  scheduleBodyContentHashRefresh,
}: {
  editor: CustomBlockNoteEditor;
  doc: CustomBlockNoteProps['collaboration']['doc'];
  undoManager: Y.UndoManager;
  resourceId: string;
  collaborationReady: boolean;
  aiDiffPreview: CustomBlockNoteProps['aiDiffPreview'];
  scheduleBodyContentHashRefresh: () => void;
}) {
  const applyPendingMarkdownImport = useMemoizedFn(() => {
    if (!collaborationReady) {
      return;
    }

    const pendingImport = usePendingNoteImportStore.getState().pendingByResourceId[resourceId];
    if (!pendingImport) {
      return;
    }

    try {
      const blocks = importNoteMarkdown(editor, notePluginRegistry, pendingImport.markdown);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.success(`已导入 ${pendingImport.sourceFileName}`);
    } catch (error) {
      usePendingNoteImportStore.getState().removePendingImport(resourceId);
      toast.danger(`Markdown 导入失败：${parseErrorMessage(error)}`);
    }
  });

  useMount(() => {
    applyPendingMarkdownImport();
  });

  useUpdateEffect(() => {
    applyPendingMarkdownImport();
  }, [collaborationReady, resourceId]);

  const applyAiDiffPreview = useMemoizedFn(() => {
    if (!collaborationReady || !aiDiffPreview) return;
    if (initializeAiDiffPreview({ doc, editor, preview: aiDiffPreview })) {
      undoManager.clear();
      scheduleBodyContentHashRefresh();
    }
  });

  useMount(() => {
    applyAiDiffPreview();
  });

  useUpdateEffect(() => {
    applyAiDiffPreview();
  }, [aiDiffPreview, collaborationReady, resourceId]);
}
