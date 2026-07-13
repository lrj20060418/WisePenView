import { projectInlinePlainText } from '../../content/projection';
import type { NotePluginRegistry } from '../../content/types';

import { getCodeBlockLanguageLabel } from './language';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readLanguage(candidate: Record<string, unknown>): string {
  const props = isRecord(candidate.props) ? candidate.props : {};
  return typeof props.language === 'string' && props.language ? props.language : 'text';
}

/** 使用代码块原生 DOM 契约渲染只读 AI 候选。 */
export function CodeBlockAiDiffView(
  candidate: Record<string, unknown>,
  registry: NotePluginRegistry
): HTMLElement {
  const language = readLanguage(candidate);
  const root = document.createElement('div');
  root.className = 'bn-block-content';
  root.dataset.contentType = 'codeBlock';

  const toolbarWrapper = document.createElement('div');
  toolbarWrapper.className = 'wise-code-block-toolbarWrapper';
  toolbarWrapper.dataset.wiseCodeBlockToolbar = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'wise-code-block-toolbar';
  const languageLabel = document.createElement('span');
  languageLabel.className = 'wise-code-block-languageLabel';
  languageLabel.textContent = getCodeBlockLanguageLabel(language);
  toolbar.appendChild(languageLabel);
  toolbarWrapper.appendChild(toolbar);

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = `language-${language}`;
  code.dataset.language = language;
  code.textContent = projectInlinePlainText(candidate.content, registry);
  pre.appendChild(code);

  root.append(toolbarWrapper, pre);
  return root;
}
