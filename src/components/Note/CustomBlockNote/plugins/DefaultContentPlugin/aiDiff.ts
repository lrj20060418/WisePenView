import { projectInlinePlainText } from '../../content/projection';
import type {
  NoteAiDiffComparisonContext,
  NoteBlockAiDiff,
  NoteInlineAiDiff,
  NotePluginRegistry,
} from '../../content/types';
import styles from '../../engines/aiDiff/style.module.less';
import type { AiDiffTextRenderPlan } from '../../engines/aiDiff/textDiffStrategy';
import { paragraphAiDiffRenderStrategy } from './aiDiffStrategy';
import { acceptInlineTextHunk, discardInlineTextHunk } from './inlineDiff';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readInlineProps(inline: Record<string, unknown>): Record<string, unknown> {
  return isRecord(inline.props) ? inline.props : inline;
}

function renderInlineChildren(content: unknown, registry: NotePluginRegistry): DocumentFragment {
  const fragment = document.createDocumentFragment();
  if (!Array.isArray(content)) return fragment;
  for (const inline of content) {
    if (!isRecord(inline) || typeof inline.type !== 'string') continue;
    const owner = registry.inlinePlugins.get(inline.type);
    if (!owner) throw new Error(`AI Diff 候选内容缺少 inline owner：${inline.type}`);
    fragment.appendChild(owner.aiDiff.renderAiContent(inline, registry));
  }
  return fragment;
}

function resolveRichTextRenderPlan(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry
): AiDiffTextRenderPlan {
  const plan = paragraphAiDiffRenderStrategy.plan(
    projectInlinePlainText(current.content, registry),
    projectInlinePlainText(aiBlock.content, registry)
  );
  if (plan.mode === 'block') return plan;
  if (current.type !== 'paragraph') {
    return {
      mode: 'block',
      origin: plan.origin,
      replacement: plan.replacement,
      reason: 'unsupported-inline-structure',
      metrics: plan.metrics,
    };
  }
  const isFullyActionable = plan.hunks
    .filter((hunk) => hunk.mode === 'hunk')
    .every(
      (hunk) =>
        acceptInlineTextHunk({
          current: current.content,
          aiContent: aiBlock.content,
          hunk,
          registry,
        }) &&
        discardInlineTextHunk({
          current: current.content,
          aiContent: aiBlock.content,
          hunk,
          registry,
        })
    );
  return isFullyActionable
    ? plan
    : {
        mode: 'block',
        origin: plan.origin,
        replacement: plan.replacement,
        reason: 'unsupported-inline-structure',
        metrics: plan.metrics,
      };
}

function renderRichTextComparison(
  current: Record<string, unknown>,
  aiBlock: Record<string, unknown>,
  registry: NotePluginRegistry,
  context?: NoteAiDiffComparisonContext
): HTMLElement {
  const root = document.createElement('span');
  root.className = styles.inlineComparison;
  root.dataset.aiDiffGranularity = 'word';
  const plan = resolveRichTextRenderPlan(current, aiBlock, registry);
  if (plan.mode !== 'inline') return root;
  let hunkIndex = 0;
  for (const hunk of plan.hunks) {
    if (hunk.mode === 'outside') {
      root.append(hunk.segments.map((segment) => segment.text).join(''));
      continue;
    }
    const hunkRoot = document.createElement('span');
    hunkRoot.className = styles.inlineHunk;
    hunkRoot.dataset.aiDiffHunk = 'true';
    hunkRoot.dataset.aiDiffHunkIndex = String(hunkIndex);
    for (const segment of hunk.segments) {
      const span = document.createElement('span');
      span.textContent = segment.text;
      span.dataset.aiDiffWordRole = segment.kind;
      if (segment.kind === 'delete') span.className = styles.inlineDelete;
      if (segment.kind === 'insert') span.className = styles.inlineAdd;
      hunkRoot.appendChild(span);
    }
    if (context) {
      const actions = document.createElement('span');
      actions.className = styles.inlineHunkActions;
      const target = { kind: 'text-hunk', index: hunkIndex } as const;
      actions.appendChild(context.renderAction('discard', target));
      actions.appendChild(context.renderAction('accept', target));
      hunkRoot.appendChild(actions);
    }
    root.appendChild(hunkRoot);
    hunkIndex += 1;
  }
  return root;
}

export const plainTextInlineAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent) {
    const span = document.createElement('span');
    span.textContent = typeof aiContent.text === 'string' ? aiContent.text : '';
    return span;
  },
};

export const plainLinkInlineAiDiff: NoteInlineAiDiff = {
  renderAiContent(aiContent, registry) {
    const link = document.createElement('a');
    const props = readInlineProps(aiContent);
    link.href = typeof aiContent.href === 'string' ? aiContent.href : String(props.href ?? '');
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    link.appendChild(renderInlineChildren(aiContent.content, registry));
    return link;
  },
};

export const richTextBlockAiDiff: NoteBlockAiDiff = {
  renderAiContent(aiBlock, registry) {
    const root = document.createElement('span');
    root.appendChild(renderInlineChildren(aiBlock.content, registry));
    return root;
  },
  comparison: {
    resolveMode(current, aiBlock, registry) {
      return resolveRichTextRenderPlan(current, aiBlock, registry).mode === 'inline'
        ? 'granular'
        : 'block';
    },
    render: renderRichTextComparison,
  },
  applyGranular(block, aiContent, action, target, registry) {
    if (block.type !== 'paragraph' || target.kind !== 'text-hunk') {
      return null;
    }
    const aiBlock = { ...block, content: aiContent };
    const plan = resolveRichTextRenderPlan(block, aiBlock, registry);
    if (plan.mode !== 'inline') return null;
    const hunk = plan.hunks.filter((item) => item.mode === 'hunk')[target.index];
    if (!hunk) return null;

    if (action === 'accept') {
      return acceptInlineTextHunk({
        current: block.content,
        aiContent,
        hunk,
        registry,
      });
    }

    return discardInlineTextHunk({
      current: block.content,
      aiContent,
      hunk,
      registry,
    });
  },
};
