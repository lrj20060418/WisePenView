import type * as Y from 'yjs';

import type {
  NoteAiDiffAction,
  NoteAiDiffActionTarget,
  NotePluginRegistry,
} from '../../content/types';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';
import { isAiDiffContentEmpty, isAiDiffContentEqual, resolveNoteAiDiffBlock } from './contentState';
import {
  AI_DIFF_ACTION_ORIGIN,
  clearAiContentEntries,
  deleteBlockAiContent,
  hasBlockAiContent,
  readAllAiContent,
  readBlockAiContent,
  setBlockAiContent,
} from './store';

type ApplyAiDiffActionResult = 'applied' | 'missing' | 'unsupported';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findBlockById(
  blocks: readonly unknown[],
  blockId: string
): Record<string, unknown> | null {
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.id === blockId) return block;
    if (Array.isArray(block.children)) {
      const nested = findBlockById(block.children, blockId);
      if (nested) return nested;
    }
  }
  return null;
}

function collectBlockIds(block: Record<string, unknown>): string[] {
  const ids = typeof block.id === 'string' ? [block.id] : [];
  if (!Array.isArray(block.children)) return ids;
  for (const child of block.children) {
    if (isRecord(child)) ids.push(...collectBlockIds(child));
  }
  return ids;
}

function removeBlockWithAiContent(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  block: Record<string, unknown>;
}): void {
  const { doc, editor, block } = params;
  clearAiContentEntries(doc, collectBlockIds(block));
  editor.removeBlocks([block as Parameters<CustomBlockNoteEditor['removeBlocks']>[0][number]]);
}

function updateBlockContent(
  editor: CustomBlockNoteEditor,
  block: Record<string, unknown>,
  content: unknown
): Record<string, unknown> {
  const updated = editor.updateBlock(
    block as Parameters<CustomBlockNoteEditor['updateBlock']>[0],
    { content } as Parameters<CustomBlockNoteEditor['updateBlock']>[1]
  ) as unknown as Record<string, unknown>;
  if (!updated) {
    throw new Error(`AI Diff block 更新未生效：${String(block.id ?? '')}`);
  }
  return updated;
}

export function applyNoteAiDiffAction(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  blockId: string;
  action: NoteAiDiffAction;
  target?: NoteAiDiffActionTarget;
}): ApplyAiDiffActionResult {
  const { doc, editor, registry, blockId, action, target } = params;
  if (!hasBlockAiContent(doc, blockId)) return 'missing';

  const aiContent = readBlockAiContent(doc, blockId);
  const block = findBlockById(editor.document, blockId);
  if (!block || typeof block.type !== 'string') return 'missing';
  const aiDiff = registry.blockPlugins.get(block.type)?.aiDiff;
  if (!aiDiff || !resolveNoteAiDiffBlock(block, aiContent)) return 'unsupported';

  const granularContent = target
    ? aiDiff.applyGranular?.(block, aiContent, action, target, registry)
    : undefined;
  if (target && (granularContent === null || granularContent === undefined)) {
    return 'unsupported';
  }

  doc.transact(() => {
    if (!target) {
      if (action === 'accept') {
        if (isAiDiffContentEmpty(aiContent)) {
          removeBlockWithAiContent({ doc, editor, block });
        } else {
          updateBlockContent(editor, block, aiContent);
          deleteBlockAiContent(doc, blockId);
        }
      } else if (isAiDiffContentEmpty(block.content)) {
        removeBlockWithAiContent({ doc, editor, block });
      } else {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }

    if (action === 'accept') {
      if (isAiDiffContentEqual(granularContent, aiContent)) {
        if (isAiDiffContentEmpty(granularContent)) {
          removeBlockWithAiContent({ doc, editor, block });
          return;
        }
        updateBlockContent(editor, block, granularContent);
        deleteBlockAiContent(doc, blockId);
        return;
      }
      const updated = updateBlockContent(editor, block, granularContent);
      if (isAiDiffContentEqual(updated.content, aiContent)) {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }

    if (isAiDiffContentEqual(block.content, granularContent)) {
      if (isAiDiffContentEmpty(granularContent)) {
        removeBlockWithAiContent({ doc, editor, block });
      } else {
        deleteBlockAiContent(doc, blockId);
      }
      return;
    }
    setBlockAiContent(doc, blockId, granularContent);
  }, AI_DIFF_ACTION_ORIGIN);
  return 'applied';
}

export function applyAllNoteAiDiffActions(params: {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  action: NoteAiDiffAction;
}): ReadonlyMap<string, ApplyAiDiffActionResult> {
  const { doc, editor, registry, action } = params;
  const blockIds = [...readAllAiContent(doc).keys()];
  const results = new Map<string, ApplyAiDiffActionResult>();
  doc.transact(() => {
    for (const blockId of blockIds) {
      results.set(blockId, applyNoteAiDiffAction({ doc, editor, registry, blockId, action }));
    }
  }, AI_DIFF_ACTION_ORIGIN);
  editor.focus();
  return results;
}
