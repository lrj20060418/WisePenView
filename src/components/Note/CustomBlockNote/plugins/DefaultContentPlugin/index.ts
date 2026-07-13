import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type BlockSpecs,
  type InlineContentConfig,
  type InlineContentSpec,
} from '@blocknote/core';

import { projectInlinePlainText } from '../projection';
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

function createDefaultBlockPlugin(
  type: string,
  capabilities: NoteContentCapabilityDeclarations,
  outline = false
) {
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
    projection: {
      plainText: (block, registry) => projectInlinePlainText(block.content, registry),
      ...(outline
        ? {
            outlineLevel: (block: Record<string, unknown>) => {
              const props =
                typeof block.props === 'object' && block.props !== null
                  ? (block.props as Record<string, unknown>)
                  : {};
              const level = Number(props.level ?? 1);
              return Number.isFinite(level) && level > 0 ? level : 1;
            },
          }
        : {}),
    },
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
    projection: {
      plainText: (inline, registry) => {
        if (type === 'text') {
          return typeof inline.text === 'string' ? inline.text : '';
        }
        return projectInlinePlainText(inline.content, registry);
      },
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
    ...richTextBlockTypes.map((type) =>
      createDefaultBlockPlugin(type, richTextCapabilities(), type === 'heading')
    ),
    ...atomicBlockTypes.map((type) => createDefaultBlockPlugin(type, atomicCapabilities())),
  ],
} satisfies NotePluginBundle;
