import type { NoteInlineAiDiff } from '../../content/types';
import { renderKatexInto } from './katexRender';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readExpression(value: Record<string, unknown>): string {
  const props = isRecord(value.props) ? value.props : value;
  return typeof props.expression === 'string' ? props.expression : '';
}

export const inlineMathAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent) {
    const root = document.createElement('span');
    renderKatexInto(root, readExpression(aiContent), '', false);
    return root;
  },
};
