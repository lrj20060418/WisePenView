import type { DefaultStyleSchema } from '@blocknote/core';
import type { ReactCustomInlineContentRenderProps } from '@blocknote/react';
import type { Transaction } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { RefObject } from 'react';
import { useCallback, useRef } from 'react';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note/enum';
import { getAiDiffDisplayModeSnapshot } from '@/store/useAiDiffDisplayStore';
import { useAiDiffDisplayModeContext } from './displayModeContext';
import { applyAiDiffActionForKey, isInlineContentEffectivelyEmpty } from './patch';
import styles from './style.module.less';

type AiDiffActionMode = 'accept' | 'discard';
type AiVisualMode = 'hidden' | 'plain' | 'compare';

type AiDiffConfig = {
  readonly type: 'ai-diff';
  readonly propSchema: {
    readonly origin: { readonly default: '' };
    readonly replace: { readonly default: '' };
    readonly key: { readonly default: '' };
    readonly granularity: { readonly default: 'word' };
  };
  readonly content: 'none';
};

type AiAddConfig = {
  readonly type: 'ai-add';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

type AiDeleteConfig = {
  readonly type: 'ai-delete';
  readonly propSchema: {
    readonly text: { readonly default: '' };
    readonly key: { readonly default: '' };
  };
  readonly content: 'none';
};

type AiDiffResolvedView = {
  mode: AiVisualMode;
  plainText: string;
  origin: string;
  replace: string;
};

type AiDiffActionButtonsProps = {
  onApply: (mode: AiDiffActionMode) => void;
};

type EditorForActions = {
  prosemirrorView: EditorView;
  transact: (fn: (tr: Transaction) => void | Transaction) => void;
  focus: () => void;
  getTextCursorPosition: () => unknown;
  updateBlock: (block: unknown, update: unknown) => void;
  removeBlocks?: (blocks: readonly unknown[]) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getCursorBlock(editor: EditorForActions): unknown | null {
  try {
    const cursor = editor.getTextCursorPosition();
    if (!isRecord(cursor)) return null;
    const block = cursor['block'];
    return block ?? null;
  } catch {
    return null;
  }
}

function focusCaretAtInlineNode(editor: EditorForActions, shell: HTMLElement | null): void {
  if (!shell) return;
  const view = editor.prosemirrorView;
  try {
    const pos = view.posAtDOM(shell, 0);
    editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, Math.max(0, pos))));
  } catch {
    void 0;
  }
  editor.focus();
}

function blockHasNestedChildren(block: Record<string, unknown>): boolean {
  const ch = block['children'];
  return Array.isArray(ch) && ch.length > 0;
}

function useApplyAiDiffAction(
  editor: unknown,
  changeKey: string,
  shellRef: RefObject<HTMLElement | null>
): (mode: AiDiffActionMode) => void {
  return useCallback(
    (mode: AiDiffActionMode) => {
      const ed = editor as EditorForActions;
      focusCaretAtInlineNode(ed, shellRef.current);
      const block = getCursorBlock(ed);
      if (!block || !isRecord(block)) return;
      const content = block['content'];
      const next = applyAiDiffActionForKey(content, changeKey, mode);
      if (!next) return;
      if (isInlineContentEffectivelyEmpty(next) && !blockHasNestedChildren(block)) {
        try {
          ed.removeBlocks?.([block]);
        } catch {
          void 0;
        }
        ed.focus();
        return;
      }
      try {
        ed.updateBlock(block, { content: next });
      } catch {
        void 0;
      }
      ed.focus();
    },
    [changeKey, editor, shellRef]
  );
}

function resolveDiffViewState(
  displayMode: AiDiffDisplayMode,
  payload: { origin: string; replace: string }
): AiDiffResolvedView {
  const origin = payload.origin;
  const replace = payload.replace;

  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: origin ? 'plain' : 'hidden', plainText: origin, origin, replace };
  }
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: replace ? 'plain' : 'hidden', plainText: replace, origin, replace };
  }
  const hasCompareText = Boolean(origin || replace);
  return { mode: hasCompareText ? 'compare' : 'hidden', plainText: '', origin, replace };
}

function resolveAddViewState(
  displayMode: AiDiffDisplayMode,
  text: string
): { mode: AiVisualMode; plainText: string } {
  if (!text) return { mode: 'hidden', plainText: '' };
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: 'hidden', plainText: '' };
  }
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: 'plain', plainText: text };
  }
  return { mode: 'compare', plainText: '' };
}

function resolveDeleteViewState(
  displayMode: AiDiffDisplayMode,
  text: string
): { mode: AiVisualMode; plainText: string } {
  if (!text) return { mode: 'hidden', plainText: '' };
  if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) {
    return { mode: 'hidden', plainText: '' };
  }
  if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) {
    return { mode: 'plain', plainText: text };
  }
  return { mode: 'compare', plainText: '' };
}

/** 占位内联 atom，避免 React 对 NodeView 返回 `null` 时 PM 映射错乱、协作下内容丢失 */
function StrategyHiddenShell({ setRefs }: { setRefs: (node: HTMLSpanElement | null) => void }) {
  return (
    <span
      ref={setRefs}
      className={styles.aiDiffInlineStrategyHidden}
      contentEditable={false}
      aria-hidden="true"
    >
      {'\u200B'}
    </span>
  );
}

function AiDiffActionButtons({ onApply }: AiDiffActionButtonsProps) {
  return (
    <span className={styles.aiActionsAnchor} contentEditable={false} aria-hidden="true">
      <span className={styles.aiActionsRoot} contentEditable={false} aria-hidden="true">
        <button
          type="button"
          aria-label="保留"
          className={`${styles.aiActionBtn} ${styles.aiActionAccept}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('accept');
          }}
        >
          Keep
        </button>
        <button
          type="button"
          aria-label="撤销"
          className={`${styles.aiActionBtn} ${styles.aiActionDiscard}`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onApply('discard');
          }}
        >
          Undo
        </button>
      </span>
    </span>
  );
}

export function AiDiffView(
  props: ReactCustomInlineContentRenderProps<AiDiffConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const origin = String(inlineContent.props.origin ?? '');
  const replace = String(inlineContent.props.replace ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveDiffViewState(displayMode, { origin, replace });

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      {viewState.origin ? <span className={styles.aiDeleteRoot}>{viewState.origin}</span> : null}
      {viewState.replace ? <span className={styles.aiAddRoot}>{viewState.replace}</span> : null}
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiDiffExportHTML(
  props: ReactCustomInlineContentRenderProps<AiDiffConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const displayMode = getAiDiffDisplayModeSnapshot();
  const origin = String(inlineContent.props.origin ?? '');
  const replace = String(inlineContent.props.replace ?? '');
  const viewState = resolveDiffViewState(displayMode, { origin, replace });
  if (viewState.mode === 'hidden') {
    return <span />;
  }
  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }
  return (
    <span className={styles.aiDiffRoot}>
      {viewState.origin ? <span className={styles.aiDeleteRoot}>{viewState.origin}</span> : null}
      {viewState.replace ? <span className={styles.aiAddRoot}>{viewState.replace}</span> : null}
    </span>
  );
}

export function AiAddView(
  props: ReactCustomInlineContentRenderProps<AiAddConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveAddViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      <span className={styles.aiAddRoot}>{text}</span>
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiAddExportHTML(
  props: ReactCustomInlineContentRenderProps<AiAddConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const displayMode = getAiDiffDisplayModeSnapshot();
  const text = String(inlineContent.props.text ?? '');
  const viewState = resolveAddViewState(displayMode, text);
  if (viewState.mode === 'hidden') {
    return <span />;
  }
  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }
  return (
    <span className={styles.aiDiffRoot}>
      <span className={styles.aiAddRoot}>{text}</span>
    </span>
  );
}

export function AiDeleteView(
  props: ReactCustomInlineContentRenderProps<AiDeleteConfig, DefaultStyleSchema>
) {
  const { editor, inlineContent } = props;
  const displayMode = useAiDiffDisplayModeContext();
  const shellRef = useRef<HTMLSpanElement | null>(null);
  const text = String(inlineContent.props.text ?? '');
  const changeKey = String(inlineContent.props.key ?? '');
  const viewState = resolveDeleteViewState(displayMode, text);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    shellRef.current = node;
  }, []);
  const apply = useApplyAiDiffAction(editor, changeKey, shellRef);

  if (viewState.mode === 'hidden') {
    return <StrategyHiddenShell setRefs={setRefs} />;
  }

  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }

  return (
    <span ref={setRefs} className={styles.aiDiffRoot} contentEditable={false}>
      <span className={styles.aiDeleteRoot}>{text}</span>
      <AiDiffActionButtons onApply={apply} />
    </span>
  );
}

export function AiDeleteExportHTML(
  props: ReactCustomInlineContentRenderProps<AiDeleteConfig, DefaultStyleSchema>
) {
  const { inlineContent } = props;
  const displayMode = getAiDiffDisplayModeSnapshot();
  const text = String(inlineContent.props.text ?? '');
  const viewState = resolveDeleteViewState(displayMode, text);
  if (viewState.mode === 'hidden') {
    return <span />;
  }
  if (viewState.mode === 'plain') {
    return <span>{viewState.plainText}</span>;
  }
  return (
    <span className={styles.aiDiffRoot}>
      <span className={styles.aiDeleteRoot}>{text}</span>
    </span>
  );
}

export function AiActionsView() {
  return <span className={styles.aiActionsLegacy} contentEditable={false} aria-hidden="true" />;
}

export function AiActionsExportHTML() {
  return <span />;
}
