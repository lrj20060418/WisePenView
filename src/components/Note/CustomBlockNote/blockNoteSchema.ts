import { createNoteBlockNoteSchema, notePluginRegistry } from './plugins';

/**
 * 笔记正文编辑器 schema：合并各插件贡献的 blockSpecs / inlineContentSpecs。
 * 新增内容类型：在 `plugins/index.ts` 的树中注册唯一 owner。
 */
export const blockNoteSchema = createNoteBlockNoteSchema(notePluginRegistry);

export type CustomBlockNoteSchema = typeof blockNoteSchema;

/** 带各插件块的编辑器类型，供 slash 菜单与插入 API 使用 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export type CustomBlockNotePartialBlock = typeof blockNoteSchema.PartialBlock;
