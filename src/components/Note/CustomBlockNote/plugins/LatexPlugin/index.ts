import type { NoteBlockPlugin, NoteInlinePlugin, NotePluginBundle } from '../types';
import { inlineMathContentSpec } from './InlineMath';
import { inlineMathDollarExtension } from './InlineMath/inlineMathDollarExtension';
import { createMathBlockSpec } from './MathBlock';
import { createMathSlashMenuItem } from './slashMenuItem';

export const mathBlockPlugin = {
  kind: 'block',
  id: 'latex.block.math',
  type: 'math',
  spec: createMathBlockSpec(),
  capabilities: {
    markdownImport: { support: 'unsupported', reason: '当前没有公式块 Markdown parse' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    comments: { support: 'custom' },
    projection: { support: 'custom' },
    print: { support: 'custom' },
  },
  slashMenu: ({ editor }) => [createMathSlashMenuItem(editor)],
} satisfies NoteBlockPlugin;

export const inlineMathPlugin = {
  kind: 'inline',
  id: 'latex.inline.inlineMath',
  type: 'inlineMath',
  spec: inlineMathContentSpec,
  capabilities: {
    markdownImport: { support: 'unsupported', reason: '当前没有行内公式 Markdown parse' },
    markdownExport: { support: 'custom' },
    aiDiff: { support: 'custom' },
    comments: { support: 'custom' },
    projection: { support: 'custom' },
    print: { support: 'custom' },
  },
  extensions: () => [inlineMathDollarExtension()],
} satisfies NoteInlinePlugin;

export const latexPlugin = {
  kind: 'bundle',
  id: 'latex',
  children: [mathBlockPlugin, inlineMathPlugin],
} satisfies NotePluginBundle;
