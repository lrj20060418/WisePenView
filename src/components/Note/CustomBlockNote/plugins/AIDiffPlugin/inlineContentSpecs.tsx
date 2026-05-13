import { createReactInlineContentSpec } from '@blocknote/react';

import {
  AiActionsExportHTML,
  AiActionsView,
  AiAddExportHTML,
  AiAddView,
  AiDeleteExportHTML,
  AiDeleteView,
  AiDiffExportHTML,
  AiDiffView,
} from './inlineContentViews.tsx';

const aiDiffConfig = {
  type: 'ai-diff',
  propSchema: {
    origin: { default: '' },
    replace: { default: '' },
    key: { default: '' },
    // Reserved for future multi-granularity switching: 'character' | 'word' | 'sentence' | 'block'
    granularity: { default: 'word' },
  },
  content: 'none',
} as const;

const aiAddConfig = {
  type: 'ai-add',
  propSchema: {
    text: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

const aiDeleteConfig = {
  type: 'ai-delete',
  propSchema: {
    text: { default: '' },
    key: { default: '' },
  },
  content: 'none',
} as const;

const aiActionsConfig = {
  type: 'ai-actions',
  propSchema: {
    key: { default: '' },
  },
  content: 'none',
} as const;

export const aiDiffInlineContentSpec = createReactInlineContentSpec(aiDiffConfig, {
  render: AiDiffView,
  toExternalHTML: AiDiffExportHTML,
});

export const aiAddInlineContentSpec = createReactInlineContentSpec(aiAddConfig, {
  render: AiAddView,
  toExternalHTML: AiAddExportHTML,
});

export const aiDeleteInlineContentSpec = createReactInlineContentSpec(aiDeleteConfig, {
  render: AiDeleteView,
  toExternalHTML: AiDeleteExportHTML,
});

export const aiActionsInlineContentSpec = createReactInlineContentSpec(aiActionsConfig, {
  render: AiActionsView,
  toExternalHTML: AiActionsExportHTML,
});
