import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { TextSelection } from '@tiptap/pm/state';
import { useMemoizedFn } from 'ahooks';
import { useMemo, type Dispatch, type SetStateAction } from 'react';

import { exportNoteMarkdown } from '../engines/markdown/markdownExport';
import { printNotePdfViaBrowser, waitForEditorPaint } from '../engines/print/noteBrowserPrint';
import {
  findActiveSearchMatchElement,
  getSearchMatchIndexAtPosition,
  searchPluginKey,
  type SearchExtensionMeta,
} from '../engines/search/extension';
import {
  applyNoteReplaceOperations,
  collectFindReplaceMatches,
  selectNoteReplaceOperations,
} from '../engines/search/findReplace';
import type { NoteBodyEditorHandle, NoteFindResult } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../registry/noteEditorComposition';
import type { NoteScrollTargetResolver } from './useNoteEditorScroll';

type NoteEditorCommands = Omit<NoteBodyEditorHandle, 'scrollToAnchor'>;

export function useNoteEditorCommands(
  editor: CustomBlockNoteEditor,
  setExportDisplayModeOverride: Dispatch<SetStateAction<AiDiffDisplayMode | null>>,
  scrollToTarget: (resolveTarget: NoteScrollTargetResolver) => void,
  canReplace: boolean
): NoteEditorCommands {
  const dispatchSearchMeta = useMemoizedFn((meta: SearchExtensionMeta) => {
    const view = editor.prosemirrorView;
    view.dispatch(view.state.tr.setMeta(searchPluginKey, meta).setMeta('addToHistory', false));
  });

  const clearFind = useMemoizedFn(() => {
    dispatchSearchMeta({ query: '', matches: [], activeIndex: -1 });
  });

  const collapseSelection = useMemoizedFn(() => {
    const view = editor.prosemirrorView;
    const { selection } = view.state;
    if (selection.empty) return;

    const tr = view.state.tr;
    tr.setSelection(TextSelection.create(view.state.doc, selection.head));
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  });

  const findMatches = useMemoizedFn((query: string): NoteFindResult | null => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearFind();
      return null;
    }

    const view = editor.prosemirrorView;
    const doc = view.state.doc;

    const matches = collectFindReplaceMatches(doc, trimmedQuery, notePluginRegistry);

    if (matches.length > 0) {
      const activeIndex = getSearchMatchIndexAtPosition(matches, view.state.selection.from);
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: trimmedQuery,
        matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
      return { current: activeIndex + 1, total: matches.length };
    } else {
      dispatchSearchMeta({ query: trimmedQuery, matches: [], activeIndex: -1 });
    }

    return null;
  });

  const findNext = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = (state.activeIndex + 1) % state.matches.length;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    return { current: activeIndex + 1, total: state.matches.length };
  });

  const findPrev = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = state.activeIndex <= 0 ? state.matches.length - 1 : state.activeIndex - 1;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    return { current: activeIndex + 1, total: state.matches.length };
  });

  const getSearchResult = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    return { current: state.activeIndex + 1, total: state.matches.length };
  });

  const replaceMatches = useMemoizedFn((replacement: string, replaceAll: boolean) => {
    if (!canReplace) return { replaced: 0, result: getSearchResult() };

    const view = editor.prosemirrorView;
    const state = searchPluginKey.getState(view.state);
    if (!state || state.matches.length === 0) return { replaced: 0, result: null };

    const operations = selectNoteReplaceOperations(
      state.matches,
      state.activeIndex,
      replaceAll,
      canReplace
    );
    if (operations.length === 0) return { replaced: 0, result: getSearchResult() };

    const tr = applyNoteReplaceOperations(view.state.tr, operations, replacement);
    view.dispatch(tr);
    const result = getSearchResult();
    if (result) scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    return { replaced: operations.length, result };
  });

  const replaceCurrent = useMemoizedFn((replacement: string) => replaceMatches(replacement, false));
  const replaceAll = useMemoizedFn((replacement: string) => replaceMatches(replacement, true));

  const findStateRef = useRef<{
    matches: { from: number; to: number }[];
    currentIndex: number;
    originalSelection: { from: number; to: number } | null;
  }>({
    matches: [],
    currentIndex: -1,
    originalSelection: null,
  });

  const scrollMatchIntoView = useMemoizedFn((from: number) => {
    const view = editor.prosemirrorView;
    const domNode = view.domAtPos(from).node;
    const element = domNode instanceof Element ? domNode : domNode.parentElement;
    if (element?.isConnected) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      element.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    }
  });

  const dispatchSearchMeta = useMemoizedFn((meta: SearchExtensionMeta) => {
    const view = editor.prosemirrorView;
    view.dispatch(view.state.tr.setMeta(searchPluginKey, meta).setMeta('addToHistory', false));
  });

  const clearFind = useMemoizedFn(() => {
    const state = findStateRef.current;
    const view = editor.prosemirrorView;

    // Clear search decorations
    dispatchSearchMeta({ query: '', matches: [], activeIndex: -1 });

    // Restore original selection if saved
    if (state.originalSelection) {
      const { from, to } = state.originalSelection;
      const doc = view.state.doc;
      if (from <= doc.content.size && to <= doc.content.size) {
        const tr = view.state.tr;
        tr.setSelection(TextSelection.create(doc, from, to));
        view.dispatch(tr);
      }
    }

    state.matches = [];
    state.currentIndex = -1;
    state.originalSelection = null;
  });

  const findMatches = useMemoizedFn((query: string): number => {
    clearFind();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return 0;

    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    const lowerQuery = trimmedQuery.toLowerCase();

    const state = findStateRef.current;
    state.originalSelection = {
      from: view.state.selection.from,
      to: view.state.selection.to,
    };

    const matches: { from: number; to: number }[] = [];
    doc.descendants((node, pos) => {
      if (!node.isText) return;
      const text = node.text ?? '';
      const lowerText = text.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom);
        if (idx === -1) break;
        matches.push({ from: pos + idx, to: pos + idx + trimmedQuery.length });
        searchFrom = idx + 1;
      }
    });

    state.matches = matches;

    if (matches.length > 0) {
      state.currentIndex = 0;
      // Dispatch decorations + selection together
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: trimmedQuery,
        matches,
        activeIndex: 0,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, matches[0].from, matches[0].to));
      view.dispatch(tr);
      scrollMatchIntoView(matches[0].from);
    } else {
      // Dispatch empty to ensure decorations are cleared
      dispatchSearchMeta({ query: trimmedQuery, matches: [], activeIndex: -1 });
    }

    return matches.length;
  });

  const findNext = useMemoizedFn((): NoteFindResult | null => {
    const state = findStateRef.current;
    if (state.matches.length === 0) return null;
    state.currentIndex = (state.currentIndex + 1) % state.matches.length;
    const match = state.matches[state.currentIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: '',
        matches: state.matches,
        activeIndex: state.currentIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollMatchIntoView(match.from);
    }
    return { current: state.currentIndex + 1, total: state.matches.length };
  });

  const findPrev = useMemoizedFn((): NoteFindResult | null => {
    const state = findStateRef.current;
    if (state.matches.length === 0) return null;
    state.currentIndex =
      state.currentIndex <= 0 ? state.matches.length - 1 : state.currentIndex - 1;
    const match = state.matches[state.currentIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: '',
        matches: state.matches,
        activeIndex: state.currentIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollMatchIntoView(match.from);
    }
    return { current: state.currentIndex + 1, total: state.matches.length };
  });

  return useMemo(
    () => ({
      focus: () => {
        editor.focus();
      },
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
      findMatches,
      findNext,
      findPrev,
      replaceCurrent,
      replaceAll,
      canReplace: () => canReplace,
      clearFind,
      collapseSelection,
    }),
    [
      editor,
      setExportDisplayModeOverride,
      findMatches,
      findNext,
      findPrev,
      replaceCurrent,
      replaceAll,
      canReplace,
      clearFind,
      collapseSelection,
    ]
  );
}
