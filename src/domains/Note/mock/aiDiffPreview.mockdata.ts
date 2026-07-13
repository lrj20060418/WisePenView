import type { NoteAiDiffPreviewData } from '@/domains/Note';

const text = (value: string, styles: Record<string, boolean | string> = {}) => ({
  type: 'text' as const,
  text: value,
  styles,
});

const tableContent = (rows: string[][]) => ({
  type: 'tableContent' as const,
  columnWidths: [160, 220, 140],
  headerRows: 1,
  rows: rows.map((cells) => ({
    cells: cells.map((cell) => [text(cell)]),
  })),
});

/** 覆盖新增、修改、删除、失效以及主要自定义内容类型的 AI Diff 样式。 */
export const NOTE_AI_DIFF_PREVIEW_MOCK = {
  sceneId: 'note-ai-diff-style-preview-v2',
  items: [
    {
      block: {
        id: 'mock-ai-diff-heading',
        type: 'heading',
        props: { level: 2 },
        content: [text('旧标题：季度研究计划')],
      },
      revision: 'mock-heading-r1',
      operation: 'update',
      candidate: {
        props: { level: 2 },
        content: [text('新标题：第三季度研究与交付计划', { bold: true })],
      },
    },
    {
      block: {
        id: 'mock-ai-diff-paragraph',
        type: 'paragraph',
        content: [
          text(
            '在连续六周的试运行中，团队将自动分类、人工复核与异常回退串联为同一条处理链路，初步数据表明平均处理时长已由 11.4 小时下降至 8.1 小时。'
          ),
          text(
            '需要注意的是，表面上的响应提速主要来自夜间低负载时段，而工作日上午的积压峰值并未同步消失；由于当前样本仍以常规请求为主，直接依据平均值判断方案已经稳定，可能低估高峰期的排队效应，并把任务结构变化造成的自然波动误认为自动化收益。'
          ),
          text('基于这一判断，项目仍计划在月底完成首次复盘，并保留原有上线窗口。'),
        ],
      },
      revision: 'mock-paragraph-r2',
      operation: 'update',
      candidate: {
        props: {},
        content: [
          text(
            '在连续六周的试运行中，团队将自动分类、人工复核与异常回退串联为同一条处理链路，初步数据表明平均处理时长已由 11.4 小时下降至 8.1 小时。'
          ),
          text(
            '进一步按请求到达时段和任务复杂度拆分后可以发现，改造的核心收益并非均匀缩短每个环节，而是减少了常规请求在人工队列中的等待时间；当到达速率 '
          ),
          { type: 'inlineMath', props: { expression: '\\lambda' } },
          text(' 接近处理速率 '),
          { type: 'inlineMath', props: { expression: '\\mu' } },
          text(' 时，少量复杂任务仍会显著抬高长尾延迟，因此下一阶段应将 '),
          text('P95 处理时长与异常回退率', { bold: true, textColor: 'green' }),
          text(' 设为联合门槛，并在 '),
          {
            type: 'link',
            href: 'https://example.com/report',
            content: [text('阶段报告', { underline: true })],
          },
          text(
            ' 中分别披露高峰与低峰样本，避免单一均值掩盖仍未解决的容量风险。基于这一判断，项目仍计划在月底完成首次复盘，并保留原有上线窗口。'
          ),
        ],
      },
    },
    {
      block: {
        id: 'mock-ai-diff-create',
        type: 'bulletListItem',
        content: [],
      },
      revision: 'mock-create-r1',
      operation: 'create',
      candidate: {
        props: {},
        content: [text('新增：为关键指标补充自动化回归与异常告警。')],
      },
    },
    {
      block: {
        id: 'mock-ai-diff-delete',
        type: 'quote',
        content: [text('删除：该结论仍依赖上一版样本，已不再适用。')],
      },
      revision: 'mock-delete-r1',
      operation: 'delete',
      candidate: null,
    },
    {
      block: {
        id: 'mock-ai-diff-code',
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [text("const status = 'draft';\nreturn status;")],
      },
      revision: 'mock-code-r1',
      operation: 'update',
      candidate: {
        props: { language: 'typescript' },
        content: [
          text("const status: 'draft' | 'ready' = 'ready';\nreturn { status, reviewed: true };"),
        ],
      },
    },
    {
      block: {
        id: 'mock-ai-diff-table',
        type: 'table',
        props: {},
        content: tableContent([
          ['指标', '当前值', '负责人'],
          ['处理时长', '8 小时', '林然'],
          ['覆盖率', '72%', '周宁'],
        ]),
      },
      revision: 'mock-table-r1',
      operation: 'update',
      candidate: {
        props: {},
        content: tableContent([
          ['指标', '目标值', '负责人'],
          ['处理时长', '5 小时', '林然'],
          ['覆盖率', '90%', '周宁'],
          ['自动化率', '85%', '陈默'],
        ]),
      },
    },
    {
      block: {
        id: 'mock-ai-diff-math',
        type: 'math',
        props: { expression: 'E = mc^2', autoEdit: false },
      },
      revision: 'mock-math-r1',
      operation: 'update',
      candidate: {
        props: { expression: 'E_k = \\frac{1}{2}mv^2', autoEdit: false },
        content: undefined,
      },
    },
    {
      block: {
        id: 'mock-ai-diff-stale',
        type: 'checkListItem',
        props: { checked: false },
        content: [text('失效态：正文在 AI 生成建议后又被修改。')],
      },
      revision: 'mock-stale-r1',
      operation: 'update',
      stale: true,
      candidate: {
        props: { checked: true },
        content: [text('失效态：这条候选内容不能直接保留。')],
      },
    },
  ],
} satisfies NoteAiDiffPreviewData;
