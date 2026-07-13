import type { NoteBlockAiDiff, NoteInlineAiDiff } from '../../content/types';
import {
  resolveNoteAiDiffBlock,
  resolveNoteAiDiffBlockAction,
} from '../../engines/aiDiff/projection';
import { stableStringify } from '../../engines/aiDiff/stableValue';
import { renderKatexInto } from './katexRender';
import mathBlockStyles from './MathBlock/style.module.less';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readExpression(value: Record<string, unknown>): string {
  const props = isRecord(value.props) ? value.props : value;
  return typeof props.expression === 'string' ? props.expression : '';
}

export const inlineMathAiDiff: NoteInlineAiDiff = {
  equals(current, candidate) {
    return stableStringify(current) === stableStringify(candidate);
  },
  renderCandidate(candidate) {
    const root = document.createElement('span');
    renderKatexInto(root, readExpression(candidate), '', false);
    return root;
  },
};

function renderMathBlockCandidate(candidate: Record<string, unknown>): HTMLElement {
  const shell = document.createElement('div');
  shell.className = `${mathBlockStyles.mathShell} ${mathBlockStyles.mathShellBlock} bn-math-block-root`;
  shell.contentEditable = 'false';
  shell.dataset.readOnly = 'true';

  const root = document.createElement('div');
  root.className = `${mathBlockStyles.mathRoot} ${mathBlockStyles.mathRootReadonly}`;
  const preview = document.createElement('div');
  preview.className = mathBlockStyles.mathPreview;
  renderKatexInto(preview, readExpression(candidate), mathBlockStyles.mathPlaceholder, true);
  root.appendChild(preview);
  shell.appendChild(root);
  return shell;
}

export const mathBlockAiDiff: NoteBlockAiDiff = {
  resolve: resolveNoteAiDiffBlock,
  renderCandidate: renderMathBlockCandidate,
  apply(_block, aiContent, action) {
    return resolveNoteAiDiffBlockAction(aiContent, action, 'none');
  },
};
