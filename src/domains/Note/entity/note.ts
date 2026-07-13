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

/** Mock 环境用于驱动 AI Diff 真实渲染链路的块快照。 */
export interface NoteAiDiffPreviewBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: NoteAiDiffPreviewBlock[];
}

export interface NoteAiDiffPreviewCandidate {
  props: Record<string, unknown>;
  content: unknown;
}

export interface NoteAiDiffPreviewItem {
  block: NoteAiDiffPreviewBlock;
  revision: string;
  operation: 'create' | 'update' | 'delete';
  candidate: NoteAiDiffPreviewCandidate | null;
  /** 用于覆盖“正文已变化”的失效态样式。 */
  stale?: boolean;
}

export interface NoteAiDiffPreviewData {
  /** 场景版本变化时重新初始化；单次页面会话内保留用户已执行的保留/撤销结果。 */
  sceneId: string;
  items: NoteAiDiffPreviewItem[];
}
