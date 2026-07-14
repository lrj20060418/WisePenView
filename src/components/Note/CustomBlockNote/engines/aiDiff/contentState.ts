import { stableStringify } from './stableValue';

interface NoteAiDiffProjection {
  current: Record<string, unknown>;
  aiBlock: Record<string, unknown>;
  currentEmpty: boolean;
  aiContentEmpty: boolean;
  changeKind: 'create' | 'update' | 'delete';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAiDiffContentEqual(current: unknown, aiContent: unknown): boolean {
  return stableStringify(current) === stableStringify(aiContent);
}

export function isAiDiffContentEmpty(content: unknown): boolean {
  if (content === null || content === undefined || content === '') return true;
  if (Array.isArray(content)) return content.length === 0;
  if (!isRecord(content)) return false;
  return Array.isArray(content.rows) && content.rows.length === 0;
}

export function resolveNoteAiDiffBlock(
  block: Record<string, unknown>,
  aiContent: unknown
): NoteAiDiffProjection | null {
  if (isAiDiffContentEqual(block.content, aiContent)) return null;
  const currentEmpty = isAiDiffContentEmpty(block.content);
  const aiContentEmpty = isAiDiffContentEmpty(aiContent);
  return {
    current: block,
    aiBlock: { ...block, content: aiContent },
    currentEmpty,
    aiContentEmpty,
    changeKind: currentEmpty ? 'create' : aiContentEmpty ? 'delete' : 'update',
  };
}
