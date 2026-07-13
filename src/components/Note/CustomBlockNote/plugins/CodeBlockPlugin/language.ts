import { codeBlockOptions } from '@blocknote/code-block';

import type { CodeBlockLanguageOption } from './CodeBlockToolbar';

const BASE_LANGUAGE_OPTIONS: CodeBlockLanguageOption[] = Object.entries(
  codeBlockOptions.supportedLanguages ?? {}
).map(([id, { name }]) => ({ id, label: name }));

export function getCodeBlockLanguageOptions(language: string): CodeBlockLanguageOption[] {
  if (BASE_LANGUAGE_OPTIONS.some((option) => option.id === language)) {
    return BASE_LANGUAGE_OPTIONS;
  }
  return [{ id: language, label: language }, ...BASE_LANGUAGE_OPTIONS];
}

export function getCodeBlockLanguageLabel(language: string): string {
  return (
    getCodeBlockLanguageOptions(language).find((option) => option.id === language)?.label ??
    language
  );
}
