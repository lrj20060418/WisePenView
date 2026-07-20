import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import { exportNoteMarkdown } from '../engines/markdown/markdownExport';
import { printNotePdfViaBrowser, waitForEditorPaint } from '../engines/print/noteBrowserPrint';
import type { NoteBodyEditorHandle, NoteEditorAnchor } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';

function resolveCurrentBlockElement(editor: CustomBlockNoteEditor): HTMLElement | null {
  const view = editor.prosemirrorView;
  const domNode = view.domAtPos(view.state.selection.from).node;
  const element = domNode instanceof Element ? domNode : domNode.parentElement;
  return element?.closest<HTMLElement>('.bn-block-outer') ?? null;
}

function useNoteScroll(editor: CustomBlockNoteEditor) {
  const queuedFrameRef = useRef<number | null>(null);

  useUnmount(() => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);
  });

  return useMemoizedFn((anchor: NoteEditorAnchor) => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);

    let blockElement: HTMLElement | null = null;
    if (anchor.kind === 'block') {
      try {
        editor.setTextCursorPosition(anchor.blockId, 'start');
        editor.focus();
        blockElement = resolveCurrentBlockElement(editor);
      } catch {
        editor.focus();
        return;
      }
    }

    queuedFrameRef.current = window.requestAnimationFrame(() => {
      queuedFrameRef.current = null;
      const target =
        anchor.kind === 'block'
          ? blockElement
          : editor.prosemirrorView.dom.querySelector<HTMLElement>(
              `[data-inline-comment-thread-id="${CSS.escape(anchor.threadId)}"]`
            );
      if (!target?.isConnected) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      target.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    });
  });
}

export function useNoteEditorCommands(
  editor: CustomBlockNoteEditor,
  setExportDisplayModeOverride: Dispatch<SetStateAction<AiDiffDisplayMode | null>>
): NoteBodyEditorHandle {
  const scrollToAnchor = useNoteScroll(editor);

  return useMemo(
    () => ({
      focus: () => {
        editor.focus();
      },
      scrollToAnchor,
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, notePluginRegistry, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
        }
      },
      exportMarkdown: () => ({
        content: exportNoteMarkdown(
          editor,
          notePluginRegistry,
          editor.document,
          AI_DIFF_DISPLAY_MODE.OLD_ONLY
        ),
        mimeType: 'text/markdown;charset=utf-8',
        extension: 'md',
      }),
    }),
    [editor, scrollToAnchor, setExportDisplayModeOverride]
  );
}
