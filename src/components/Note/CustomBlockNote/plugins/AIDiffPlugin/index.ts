import { createExtension, nodeToBlock } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorProps, EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note/enum';
import { getAiDiffDisplayModeSnapshot, useAiDiffDisplayStore } from '@/store/useAiDiffDisplayStore';
import type { NoteEditorPlugin } from '../types';
import {
  aiActionsInlineContentSpec,
  aiAddInlineContentSpec,
  aiDeleteInlineContentSpec,
  aiDiffInlineContentSpec,
} from './inlineContentSpecs';

const aiDiffBlockFoldPluginKey = new PluginKey('wisePenAiDiffBlockFold');

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type InlineContentLike = {
  type?: unknown;
  text?: unknown;
  props?: unknown;
};

function isInlineContentLike(v: unknown): v is InlineContentLike {
  return typeof v === 'object' && v !== null;
}

function getInlineType(v: unknown): string {
  if (!isInlineContentLike(v)) return '';
  return typeof v.type === 'string' ? v.type : '';
}

function getInlineText(v: unknown): string {
  if (!isInlineContentLike(v)) return '';
  return typeof v.text === 'string' ? v.text : '';
}

function getInlineFieldString(v: unknown, key: string): string {
  if (!isInlineContentLike(v)) return '';
  const value = (v as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function getInlineProps(v: unknown): Record<string, unknown> | null {
  if (!isInlineContentLike(v)) return null;
  if (typeof v.props !== 'object' || v.props === null) return null;
  return v.props as Record<string, unknown>;
}

function getPropString(props: Record<string, unknown> | null, key: string): string {
  const value = props?.[key];
  return typeof value === 'string' ? value : '';
}

function isInlineVisibleInMode(item: unknown, displayMode: AiDiffDisplayMode): boolean {
  const type = getInlineType(item);
  if (type === 'text') {
    return getInlineText(item).trim() !== '';
  }
  if (type === 'ai-actions') {
    return false;
  }
  if (type === 'ai-add') {
    const text = getPropString(getInlineProps(item), 'text');
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY;
  }
  if (type === 'ai-delete') {
    const text = getPropString(getInlineProps(item), 'text');
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY;
  }
  if (type === 'ai-diff') {
    const props = getInlineProps(item);
    const origin = getPropString(props, 'origin');
    const replace = getPropString(props, 'replace');
    if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
    if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
    return origin !== '' || replace !== '';
  }
  if (type === 'AI-Create') {
    const text = getInlineText(item);
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.OLD_ONLY;
  }
  if (type === 'AI-Delete') {
    const text = getInlineText(item);
    if (!text) return false;
    return displayMode !== AI_DIFF_DISPLAY_MODE.NEW_ONLY;
  }
  if (type === 'AI-Edit') {
    const origin = getInlineFieldString(item, 'old_text') || getInlineFieldString(item, 'text_old');
    const replace =
      getInlineFieldString(item, 'new_text') || getInlineFieldString(item, 'text_new');
    if (displayMode === AI_DIFF_DISPLAY_MODE.OLD_ONLY) return origin !== '';
    if (displayMode === AI_DIFF_DISPLAY_MODE.NEW_ONLY) return replace !== '';
    return origin !== '' || replace !== '';
  }

  return true;
}

function hasAnyAiInline(content: readonly unknown[]): boolean {
  return content.some((item) => {
    const type = getInlineType(item);
    return (
      type === 'ai-diff' ||
      type === 'ai-add' ||
      type === 'ai-delete' ||
      type === 'ai-actions' ||
      type === 'AI-Create' ||
      type === 'AI-Delete' ||
      type === 'AI-Edit'
    );
  });
}

function shouldFoldInlineContent(
  content: readonly unknown[],
  displayMode: AiDiffDisplayMode
): boolean {
  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) return false;
  if (content.length === 0) return false;
  if (!hasAnyAiInline(content)) return false;
  return !content.some((item) => isInlineVisibleInMode(item, displayMode));
}

function resolveAllChildrenFoldedAnchorId(
  children: unknown,
  displayMode: AiDiffDisplayMode
): string {
  if (!Array.isArray(children) || children.length === 0) return '';
  const first = children[0];
  if (!isRecord(first)) return '';
  const firstId = first['id'];
  if (typeof firstId !== 'string' || !firstId) return '';

  for (const child of children) {
    if (!isRecord(child)) return '';
    const id = child['id'];
    if (typeof id !== 'string' || !id) return '';
    const content = Array.isArray(child['content']) ? (child['content'] as unknown[]) : [];
    if (!shouldFoldInlineContent(content, displayMode)) {
      return '';
    }
  }

  return firstId;
}

function buildAiDiffHiddenBlockDecorations(params: {
  doc: PMNode;
  editorSchema: {
    blockSchema: unknown;
    inlineContentSchema: unknown;
    styleSchema: unknown;
  };
  displayMode: AiDiffDisplayMode;
  proseMirrorSchema: unknown;
}): DecorationSet {
  const { doc, editorSchema, displayMode, proseMirrorSchema } = params;
  if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'blockContainer') {
      return true;
    }

    let block: { type: string; content?: unknown; children?: unknown };
    try {
      block = nodeToBlock(
        node,
        proseMirrorSchema as never,
        editorSchema.blockSchema as never,
        editorSchema.inlineContentSchema as never,
        editorSchema.styleSchema as never
      ) as unknown as { type: string; content?: unknown; children?: unknown };
    } catch {
      return true;
    }

    if (block.type === 'math') {
      return true;
    }
    const content = Array.isArray(block.content) ? (block.content as unknown[]) : [];
    if (!shouldFoldInlineContent(content, displayMode)) {
      if (block.type === 'toggleListItem') {
        const anchorChildId = resolveAllChildrenFoldedAnchorId(block.children, displayMode);
        if (anchorChildId) {
          decorations.push(
            Decoration.widget(pos + node.nodeSize - 1, () => {
              const el = document.createElement('button');
              el.className = 'bn-toggle-add-block-button';
              el.setAttribute('data-ai-diff-toggle-add-placeholder', 'true');
              el.setAttribute('data-ai-diff-toggle-anchor-child-id', anchorChildId);
              el.setAttribute('contenteditable', 'false');
              el.setAttribute('type', 'button');
              el.setAttribute('role', 'button');
              el.textContent = '点击添加区块。';
              return el;
            })
          );
        }
      }
      return true;
    }

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        'data-ai-diff-block-display-hidden': 'true',
        'aria-hidden': 'true',
      })
    );
    return false;
  });

  return DecorationSet.create(doc, decorations);
}

const aiDiffBlockFoldExtension = createExtension(({ editor }) => {
  return {
    key: 'wisePenAiDiffBlockFold',
    prosemirrorPlugins: [
      new Plugin({
        key: aiDiffBlockFoldPluginKey,
        state: {
          init: (_config, state) => {
            const displayMode = getAiDiffDisplayModeSnapshot();
            return {
              displayMode,
              decorations: buildAiDiffHiddenBlockDecorations({
                doc: state.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                displayMode,
                proseMirrorSchema: state.schema,
              }),
            };
          },
          apply: (tr, value, _oldState, newState) => {
            const meta = tr.getMeta(aiDiffBlockFoldPluginKey) as
              | { displayMode?: AiDiffDisplayMode }
              | undefined;
            const nextDisplayMode = meta?.displayMode ?? value.displayMode;
            if (!tr.docChanged && nextDisplayMode === value.displayMode) {
              return value;
            }
            return {
              displayMode: nextDisplayMode,
              decorations: buildAiDiffHiddenBlockDecorations({
                doc: newState.doc as unknown as PMNode,
                editorSchema: editor.schema as unknown as {
                  blockSchema: unknown;
                  inlineContentSchema: unknown;
                  styleSchema: unknown;
                },
                displayMode: nextDisplayMode,
                proseMirrorSchema: newState.schema,
              }),
            };
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = aiDiffBlockFoldPluginKey.getState(state) as
              | { decorations: DecorationSet }
              | undefined;
            return pluginState?.decorations ?? null;
          },
          handleClick: (view, _pos, event) => {
            if (!(event instanceof MouseEvent)) return false;
            if (event.button !== 0) return false;
            const target = event.target;
            if (!(target instanceof HTMLElement)) return false;

            const pluginState = aiDiffBlockFoldPluginKey.getState(view.state) as
              | { displayMode: AiDiffDisplayMode }
              | undefined;
            const displayMode = pluginState?.displayMode ?? AI_DIFF_DISPLAY_MODE.COMPARE;
            if (displayMode === AI_DIFF_DISPLAY_MODE.COMPARE) return false;

            const placeholder = target.closest('[data-ai-diff-toggle-add-placeholder="true"]');
            if (!(placeholder instanceof HTMLElement)) return false;
            const anchorChildId =
              placeholder.getAttribute('data-ai-diff-toggle-anchor-child-id') ?? '';
            if (!anchorChildId) return false;

            const ed = editor as unknown as {
              forEachBlock?: (cb: (block: unknown) => boolean) => void;
              insertBlocks: (
                blocks: unknown[],
                referenceBlock: unknown,
                placement: 'before' | 'after'
              ) => unknown[];
              setTextCursorPosition: (id: string, pos: 'start' | 'end') => void;
              focus: () => void;
            };

            let refBlock: unknown | null = null;
            ed.forEachBlock?.((b) => {
              if (isRecord(b) && b['id'] === anchorChildId) {
                refBlock = b;
                return false;
              }
              return true;
            });
            if (!refBlock) return false;

            event.preventDefault();
            event.stopPropagation();
            try {
              const inserted = ed.insertBlocks([{ type: 'paragraph' }], refBlock, 'before');
              const firstInserted = inserted?.[0];
              if (isRecord(firstInserted) && typeof firstInserted['id'] === 'string') {
                ed.setTextCursorPosition(firstInserted['id'] as string, 'start');
              }
            } catch {
              void 0;
            }
            ed.focus();
            return true;
          },
        },
        view: (view) => {
          let lastMode = getAiDiffDisplayModeSnapshot();
          const unsubscribe = useAiDiffDisplayStore.subscribe((s) => {
            const nextMode = s.displayMode ?? AI_DIFF_DISPLAY_MODE.COMPARE;
            if (nextMode === lastMode) return;
            lastMode = nextMode;
            view.dispatch(
              view.state.tr
                .setMeta(aiDiffBlockFoldPluginKey, { displayMode: nextMode })
                .setMeta('addToHistory', false)
            );
          });
          return {
            destroy: () => {
              unsubscribe();
            },
          };
        },
      }),
    ],
  };
});

export function syncAiDiffBlockFoldDisplayMode(
  view: EditorView,
  displayMode: AiDiffDisplayMode
): void {
  view.dispatch(
    view.state.tr.setMeta(aiDiffBlockFoldPluginKey, { displayMode }).setMeta('addToHistory', false)
  );
}

function getNodeKey(node: PMNode): string {
  const attrs = node.attrs as unknown;
  if (typeof attrs !== 'object' || attrs === null) return '';
  const key = (attrs as Record<string, unknown>)['key'];
  return typeof key === 'string' ? key : '';
}

type AIDiffNodeName = 'ai-actions' | 'ai-diff' | 'ai-add' | 'ai-delete';

function isAIDiffNodeName(name: string): name is AIDiffNodeName {
  return name === 'ai-actions' || name === 'ai-diff' || name === 'ai-add' || name === 'ai-delete';
}

function buildDeleteRanges(params: {
  actionFrom: number;
  actionTo: number;
  actionKey: string;
  beforeNode: PMNode | null;
  afterNode: PMNode | null;
}): Array<{ from: number; to: number }> {
  const { actionFrom, actionTo, actionKey, beforeNode, afterNode } = params;
  const ranges: Array<{ from: number; to: number }> = [{ from: actionFrom, to: actionTo }];

  const matchBefore =
    beforeNode &&
    isAIDiffNodeName(beforeNode.type.name) &&
    beforeNode.type.name !== 'ai-actions' &&
    getNodeKey(beforeNode) === actionKey;
  if (matchBefore) {
    ranges.push({ from: actionFrom - beforeNode.nodeSize, to: actionFrom });
    return ranges;
  }

  const matchAfter =
    afterNode &&
    isAIDiffNodeName(afterNode.type.name) &&
    afterNode.type.name !== 'ai-actions' &&
    getNodeKey(afterNode) === actionKey;
  if (matchAfter) {
    ranges.push({ from: actionTo, to: actionTo + afterNode.nodeSize });
  }
  return ranges;
}

function buildDeleteRangesForChange(params: {
  changeFrom: number;
  changeTo: number;
  changeKey: string;
  beforeNode: PMNode | null;
  afterNode: PMNode | null;
}): Array<{ from: number; to: number }> | null {
  const { changeFrom, changeTo, changeKey, beforeNode, afterNode } = params;
  const ranges: Array<{ from: number; to: number }> = [{ from: changeFrom, to: changeTo }];

  const matchAfter =
    afterNode && afterNode.type.name === 'ai-actions' && getNodeKey(afterNode) === changeKey;
  if (matchAfter) {
    ranges.push({ from: changeTo, to: changeTo + afterNode.nodeSize });
    return ranges;
  }

  const matchBefore =
    beforeNode && beforeNode.type.name === 'ai-actions' && getNodeKey(beforeNode) === changeKey;
  if (matchBefore) {
    ranges.push({ from: changeFrom - beforeNode.nodeSize, to: changeFrom });
    return ranges;
  }

  return null;
}

function deleteRanges(view: EditorView, ranges: Array<{ from: number; to: number }>): void {
  const sorted = [...ranges].sort((a, b) => b.from - a.from);
  let tr: Transaction = view.state.tr;
  for (const r of sorted) {
    tr = tr.delete(r.from, r.to);
  }
  view.dispatch(tr);
}

export const aiDiffPlugin = {
  id: 'ai-diff',
  inlineContentSpecs: {
    'ai-diff': aiDiffInlineContentSpec,
    'ai-add': aiAddInlineContentSpec,
    'ai-delete': aiDeleteInlineContentSpec,
    'ai-actions': aiActionsInlineContentSpec,
  },
  extensions: () => [aiDiffBlockFoldExtension()],
  editorProps: () => {
    const props: Partial<EditorProps> = {
      handleDOMEvents: {
        keydown: (view, event) => {
          if (!(event instanceof KeyboardEvent)) return false;
          if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

          const { selection, doc } = view.state;

          if (selection instanceof NodeSelection) {
            const node = selection.node;
            const name = node.type.name;
            if (!isAIDiffNodeName(name)) return false;
            const key = getNodeKey(node);
            if (!key) return false;

            const from = selection.from;
            const to = selection.to;
            const $from = doc.resolve(from);
            const $to = doc.resolve(to);

            if (name === 'ai-actions') {
              const ranges = buildDeleteRanges({
                actionFrom: from,
                actionTo: to,
                actionKey: key,
                beforeNode: $from.nodeBefore,
                afterNode: $to.nodeAfter,
              });
              event.preventDefault();
              deleteRanges(view, ranges);
              return true;
            }

            const ranges = buildDeleteRangesForChange({
              changeFrom: from,
              changeTo: to,
              changeKey: key,
              beforeNode: $from.nodeBefore,
              afterNode: $to.nodeAfter,
            });
            if (!ranges) return false;
            event.preventDefault();
            deleteRanges(view, ranges);
            return true;
          }

          if (selection instanceof TextSelection && selection.empty) {
            const pos = selection.from;
            const $pos = doc.resolve(pos);

            if (event.key === 'Backspace') {
              const beforeNode = $pos.nodeBefore;
              if (!beforeNode) return false;
              const name = beforeNode.type.name;
              if (!isAIDiffNodeName(name)) return false;
              const key = getNodeKey(beforeNode);
              if (!key) return false;

              const from = pos - beforeNode.nodeSize;
              const to = pos;
              const $from = doc.resolve(from);

              if (name === 'ai-actions') {
                const ranges = buildDeleteRanges({
                  actionFrom: from,
                  actionTo: to,
                  actionKey: key,
                  beforeNode: $from.nodeBefore,
                  afterNode: $pos.nodeAfter,
                });
                event.preventDefault();
                deleteRanges(view, ranges);
                return true;
              }

              const ranges = buildDeleteRangesForChange({
                changeFrom: from,
                changeTo: to,
                changeKey: key,
                beforeNode: $from.nodeBefore,
                afterNode: $pos.nodeAfter,
              });
              if (!ranges) return false;
              event.preventDefault();
              deleteRanges(view, ranges);
              return true;
            }

            const afterNode = $pos.nodeAfter;
            if (!afterNode) return false;
            const name = afterNode.type.name;
            if (!isAIDiffNodeName(name)) return false;
            const key = getNodeKey(afterNode);
            if (!key) return false;

            const from = pos;
            const to = pos + afterNode.nodeSize;
            const $to = doc.resolve(to);

            if (name === 'ai-actions') {
              const ranges = buildDeleteRanges({
                actionFrom: from,
                actionTo: to,
                actionKey: key,
                beforeNode: $pos.nodeBefore,
                afterNode: $to.nodeAfter,
              });
              event.preventDefault();
              deleteRanges(view, ranges);
              return true;
            }

            const ranges = buildDeleteRangesForChange({
              changeFrom: from,
              changeTo: to,
              changeKey: key,
              beforeNode: $pos.nodeBefore,
              afterNode: $to.nodeAfter,
            });
            if (!ranges) return false;
            event.preventDefault();
            deleteRanges(view, ranges);
            return true;
          }

          return false;
        },
      },
    };
    return props;
  },
} satisfies NoteEditorPlugin;

export {
  acceptAiDiffInlineContent,
  aiGeneratedBlocksToBlockNoteBlocks,
  aiPatchToInlineContent,
  applyAiDiffActionForKey,
  discardAiDiffInlineContent,
  hasAiDiffInlineContent,
  isInlineContentEffectivelyEmpty,
  validateAiPatchAgainstOriginal,
} from './patch';
export type { AiGeneratedBlock, AiPatchItem } from './patch';
