import { createAiDiffTextRenderStrategy } from '../../engines/aiDiff/textDiffStrategy';

/** paragraph 使用较保守的行内策略；达到任一阈值后改用整块审阅。 */
export const paragraphAiDiffRenderStrategy = createAiDiffTextRenderStrategy({
  maxChangeRatio: 0.35,
  maxHunkChangeRatio: 0.3,
  maxHunkChangedCharacters: 64,
  maxHunks: 8,
});
