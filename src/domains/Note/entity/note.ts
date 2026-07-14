export interface Block {
  id: string;
  type: string;
  props: Record<string, boolean | number | string>;
  content: InlineContent[] | TableContent | undefined;
  children: Block[];
}

export type InlineContent = StyledText | Link | CustomInlineContent;

export interface StyledText {
  type: 'text';
  text: string;
  styles: Record<string, string>;
}

export interface Link {
  type: 'link';
  content: StyledText[];
  href: string;
}

export interface CustomInlineContent {
  type: string;
  content: StyledText[] | undefined;
  props: Record<string, boolean | number | string>;
}

export type TableContent = unknown;

/** Mock 环境写入 BlockNote content 的原生 block 快照。 */
export interface NoteBlockSnapshot {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content?: unknown;
  'ai-content'?: unknown;
  children: NoteBlockSnapshot[];
}

export interface NoteAiDiffPreviewData {
  content: NoteBlockSnapshot[];
}
