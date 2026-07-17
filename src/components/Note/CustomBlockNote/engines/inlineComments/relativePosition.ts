import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
  type ProsemirrorBinding,
} from 'y-prosemirror';
import type { XmlFragment } from 'yjs';
import * as Y from 'yjs';

import type { InlineCommentAnchor, InlineCommentDraft } from '@/domains/Interact';
import type { CustomBlockNoteEditor } from '../../noteEditorComposition';
import type { NotePluginRegistry } from '../../registry/types';

function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function decodeBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeRelativePosition(position: Y.RelativePosition): string {
  return encodeBytes(Y.encodeRelativePosition(position));
}

function readBinding(editor: CustomBlockNoteEditor): ProsemirrorBinding | null {
  const syncState = ySyncPluginKey.getState(editor.prosemirrorState) as
    { binding?: ProsemirrorBinding } | undefined;
  return syncState?.binding ?? null;
}

function projectSelectedText(editor: CustomBlockNoteEditor, registry: NotePluginRegistry): string {
  const { doc, selection } = editor.prosemirrorState;
  const selectedText = doc.textBetween(selection.from, selection.to, '\n', (leafNode) => {
    const owner = registry.inlinePlugins.get(leafNode.type.name);
    if (!owner) return '';
    const pluginSelection = owner.selection.inspect(
      { type: leafNode.type.name, props: leafNode.attrs },
      { selected: true, selectedText: '' }
    );
    return pluginSelection.selected ? pluginSelection.text : '';
  });
  const selectedBlocks = editor.getSelection()?.blocks ?? [];
  if (selectedBlocks.length !== 1) return selectedText;
  const block = selectedBlocks[0] as unknown as Record<string, unknown> & { type?: string };
  const owner = block.type ? registry.blockPlugins.get(block.type) : undefined;
  const pluginSelection = owner?.selection.inspect(block, { selected: true, selectedText });
  return pluginSelection?.selected ? pluginSelection.text : selectedText;
}

export function captureInlineCommentDraft(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): InlineCommentDraft | null {
  const { from, to, empty } = editor.prosemirrorState.selection;
  if (empty || from === to) return null;
  const binding = readBinding(editor);
  if (!binding) return null;
  const quoteText = projectSelectedText(editor, registry);
  if (!quoteText.trim()) return null;

  return {
    anchor: {
      start: encodeRelativePosition(
        absolutePositionToRelativePosition(from, binding.type, binding.mapping)
      ),
      end: encodeRelativePosition(
        absolutePositionToRelativePosition(to, binding.type, binding.mapping)
      ),
    },
    quoteText,
  };
}

export function resolveInlineCommentAnchor(params: {
  anchor: InlineCommentAnchor;
  fragment: XmlFragment;
  binding: ProsemirrorBinding;
}): { from: number; to: number } | null {
  const { anchor, fragment, binding } = params;
  const doc = fragment.doc;
  if (!doc) return null;
  try {
    const start = relativePositionToAbsolutePosition(
      doc,
      fragment,
      Y.decodeRelativePosition(decodeBytes(anchor.start)),
      binding.mapping
    );
    const end = relativePositionToAbsolutePosition(
      doc,
      fragment,
      Y.decodeRelativePosition(decodeBytes(anchor.end)),
      binding.mapping
    );
    if (start === null || end === null || start === end) return null;
    return { from: Math.min(start, end), to: Math.max(start, end) };
  } catch {
    return null;
  }
}
