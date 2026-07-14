import { analyzeAiDiffText, type AiDiffTextHunk } from './wordDiff';

export interface AiDiffTextRenderMetrics {
  changeRatio: number;
  largestHunkChangeRatio: number;
  largestHunkChangedCharacters: number;
  hunkCount: number;
}

export type AiDiffTextBlockReason =
  | 'no-text-change'
  | 'linear-fallback'
  | 'large-change-ratio'
  | 'large-contiguous-change'
  | 'too-many-hunks'
  | 'unsupported-inline-structure';

export type AiDiffTextRenderPlan =
  | {
      mode: 'block';
      origin: string;
      replacement: string;
      reason: AiDiffTextBlockReason;
      metrics: AiDiffTextRenderMetrics;
    }
  | {
      mode: 'inline';
      origin: string;
      replacement: string;
      hunks: readonly AiDiffTextHunk[];
      metrics: AiDiffTextRenderMetrics;
    };

export interface AiDiffTextRenderStrategyOptions {
  maxChangeRatio: number;
  maxHunkChangeRatio: number;
  maxHunkChangedCharacters: number;
  maxHunks: number;
}

export interface AiDiffTextRenderStrategy {
  plan: (origin: string, replacement: string) => AiDiffTextRenderPlan;
}

function blockPlan(
  origin: string,
  replacement: string,
  reason: AiDiffTextBlockReason,
  metrics: AiDiffTextRenderMetrics
): AiDiffTextRenderPlan {
  return { mode: 'block', origin, replacement, reason, metrics };
}

/** 根据纯文本变化规模生成可渲染计划，阈值由具体内容 owner 注入。 */
export function createAiDiffTextRenderStrategy(
  options: AiDiffTextRenderStrategyOptions
): AiDiffTextRenderStrategy {
  return {
    plan(origin, replacement) {
      const analysis = analyzeAiDiffText(origin, replacement);
      const hunkCount = analysis.hunks.filter((hunk) => hunk.mode === 'hunk').length;
      const metrics = {
        changeRatio: analysis.changeRatio,
        largestHunkChangeRatio: analysis.largestHunkChangeRatio,
        largestHunkChangedCharacters: analysis.largestHunkChangedCharacters,
        hunkCount,
      };
      if (hunkCount === 0) {
        return blockPlan(origin, replacement, 'no-text-change', metrics);
      }
      if (analysis.usesLinearFallback) {
        return blockPlan(origin, replacement, 'linear-fallback', metrics);
      }
      if (analysis.changeRatio >= options.maxChangeRatio) {
        return blockPlan(origin, replacement, 'large-change-ratio', metrics);
      }
      if (
        analysis.largestHunkChangeRatio >= options.maxHunkChangeRatio ||
        analysis.largestHunkChangedCharacters > options.maxHunkChangedCharacters
      ) {
        return blockPlan(origin, replacement, 'large-contiguous-change', metrics);
      }
      if (hunkCount > options.maxHunks) {
        return blockPlan(origin, replacement, 'too-many-hunks', metrics);
      }
      return { mode: 'inline', origin, replacement, hunks: analysis.hunks, metrics };
    },
  };
}
