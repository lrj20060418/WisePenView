import type {
  BlockNoteEditor,
  BlockSchema,
  BlockSpecs,
  ExtensionFactoryInstance,
  InlineContentConfig,
  InlineContentSchema,
  InlineContentSpec,
  StyleSchema,
} from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import type { EditorProps } from '@tiptap/pm/view';

export type NoteInlineContentSpecs = Record<string, InlineContentSpec<InlineContentConfig>>;

export type PluginEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;

export type NoteCapabilityDeclaration =
  | { support: 'default' }
  | { support: 'custom' }
  | { support: 'inherited'; profile: string }
  | { support: 'unsupported'; reason: string };

export interface NoteContentCapabilityDeclarations {
  markdownImport: NoteCapabilityDeclaration;
  markdownExport: NoteCapabilityDeclaration;
  aiDiff: NoteCapabilityDeclaration;
  comments: NoteCapabilityDeclaration;
  projection: NoteCapabilityDeclaration;
  print: NoteCapabilityDeclaration;
}

export interface NoteBlockProjection {
  plainText?: (block: Record<string, unknown>, registry: NotePluginRegistry) => string;
  outlineLevel?: (block: Record<string, unknown>) => number | undefined;
}

export interface NoteInlineProjection {
  plainText: (inline: Record<string, unknown>, registry: NotePluginRegistry) => string;
}

interface NotePluginNodeBase {
  id: string;
  dependencies?: readonly string[];
}

interface NoteContentPluginBase extends NotePluginNodeBase {
  type: string;
  capabilities: NoteContentCapabilityDeclarations;
  extensions?: () => ExtensionFactoryInstance[];
  editorProps?: () => Partial<EditorProps>;
  slashMenu?: (ctx: { editor: PluginEditor }) => DefaultReactSuggestionItem[];
}

export interface NoteBlockPlugin extends NoteContentPluginBase {
  kind: 'block';
  spec: BlockSpecs[string];
  projection?: NoteBlockProjection;
}

export interface NoteInlinePlugin extends NoteContentPluginBase {
  kind: 'inline';
  spec: InlineContentSpec<InlineContentConfig>;
  projection?: NoteInlineProjection;
}

export interface NotePluginBundle extends NotePluginNodeBase {
  kind: 'bundle';
  children: readonly NotePluginNode[];
}

export type NoteContentPlugin = NoteBlockPlugin | NoteInlinePlugin;
export type NotePluginNode = NotePluginBundle | NoteContentPlugin;

export interface NoteRuntimeExtension extends NotePluginNodeBase {
  extensions?: () => ExtensionFactoryInstance[];
  editorProps?: () => Partial<EditorProps>;
}

export interface NotePluginRegistry {
  root: NotePluginBundle;
  contentPlugins: readonly NoteContentPlugin[];
  blockPlugins: ReadonlyMap<string, NoteBlockPlugin>;
  inlinePlugins: ReadonlyMap<string, NoteInlinePlugin>;
  runtimeExtensions: readonly NoteRuntimeExtension[];
}
