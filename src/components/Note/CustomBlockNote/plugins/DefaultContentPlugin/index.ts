import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type BlockSpecs,
  type InlineContentConfig,
  type InlineContentSpec,
} from '@blocknote/core';

import type {
  NoteBlockPlugin,
  NoteCapabilityDeclaration,
  NoteContentCapabilityDeclarations,
  NoteInlinePlugin,
  NotePluginBundle,
} from '../types';

const DEFAULT_CAPABILITY: NoteCapabilityDeclaration = { support: 'default' };
const UNSUPPORTED_AI_DIFF: NoteCapabilityDeclaration = {
  support: 'unsupported',
  reason: '当前内容类型不承担 AI Diff 语义',
};
const UNSUPPORTED_COMMENTS: NoteCapabilityDeclaration = {
  support: 'unsupported',
  reason: '当前内容类型没有可批注文本范围',
};

function richTextCapabilities(): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff: { support: 'inherited', profile: 'richTextBlock' },
    comments: { support: 'inherited', profile: 'textSelection' },
    projection: { support: 'inherited', profile: 'inlineContent' },
    print: DEFAULT_CAPABILITY,
  };
}

function atomicCapabilities(): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff: UNSUPPORTED_AI_DIFF,
    comments: UNSUPPORTED_COMMENTS,
    projection: DEFAULT_CAPABILITY,
    print: DEFAULT_CAPABILITY,
  };
}

function createDefaultBlockPlugin(type: string, capabilities: NoteContentCapabilityDeclarations) {
  const spec = (defaultBlockSpecs as BlockSpecs)[type];
  if (!spec) {
    throw new Error(`BlockNote 默认 block spec 不存在：${type}`);
  }
  return {
    kind: 'block',
    id: `default.block.${type}`,
    type,
    spec,
    capabilities,
  } satisfies NoteBlockPlugin;
}

function createDefaultInlinePlugin(type: 'text' | 'link') {
  const spec = defaultInlineContentSpecs[type] as InlineContentSpec<InlineContentConfig>;
  return {
    kind: 'inline',
    id: `default.inline.${type}`,
    type,
    spec,
    capabilities: {
      markdownImport: DEFAULT_CAPABILITY,
      markdownExport: DEFAULT_CAPABILITY,
      aiDiff: { support: 'inherited', profile: type === 'text' ? 'textDiff' : 'linkDiff' },
      comments: { support: 'inherited', profile: 'textSelection' },
      projection: { support: 'inherited', profile: type === 'text' ? 'text' : 'link' },
      print: DEFAULT_CAPABILITY,
    },
  } satisfies NoteInlinePlugin;
}

const richTextBlockTypes = [
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
] as const;

const atomicBlockTypes = ['audio', 'divider', 'file', 'image', 'table', 'video'] as const;

export const defaultContentPlugin = {
  kind: 'bundle',
  id: 'default-content',
  children: [
    createDefaultInlinePlugin('text'),
    createDefaultInlinePlugin('link'),
    ...richTextBlockTypes.map((type) => createDefaultBlockPlugin(type, richTextCapabilities())),
    ...atomicBlockTypes.map((type) => createDefaultBlockPlugin(type, atomicCapabilities())),
  ],
} satisfies NotePluginBundle;
