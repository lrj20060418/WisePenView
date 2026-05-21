/**
 * AI-Edit 词级 diff：分词 → LCS 序列对齐 → hunk 合并 → 分 hunk 渲染。
 */

// 分词后最小文本片段
export type AiEditToken = {
  readonly value: string; // 原始文本
  readonly start: number; // 在原文中的起始索引
  readonly end: number; // 在原文中的结束索引（不含）
};

export type DiffSegment =
  | {
      readonly kind: 'equal'; // 两侧 token 对齐且相同
      readonly oldTokens: readonly AiEditToken[]; // old 侧 token
      readonly newTokens: readonly AiEditToken[]; // new 侧 token
    }
  | { readonly kind: 'delete'; readonly oldTokens: readonly AiEditToken[] } // 仅 old 侧存在
  | { readonly kind: 'insert'; readonly newTokens: readonly AiEditToken[] }; // 仅 new 侧存在

// 合并策略参数配置
export type MergeDiffHunksOptions = {
  readonly maxGapChars: number; // 可合并 equal 段的最大字符数
  readonly maxGapTokens: number; // 可合并 equal 段的最大 token 数
  readonly breakOnNewline: boolean; // 遇到换行是否强制断开
  readonly breakOnSentenceEnd: boolean; // 遇到句末标点是否断开
  readonly breakOnClauseBoundary: boolean; // 遇到分句边界是否断开
  readonly maxMergedLength: number; // 单个合并hunk最大长度（超过则不再合并
  readonly preferSemanticBoundary: boolean; // 是否优先语义边界断开
};

// 默认的 hunk 合并参数
export const DEFAULT_MERGE_DIFF_HUNKS_OPTIONS: MergeDiffHunksOptions = {
  maxGapChars: 5, // 小间隔默认允许 5 字符
  maxGapTokens: 3, // 小间隔默认允许 3 个 token
  breakOnNewline: true,
  breakOnSentenceEnd: true,
  breakOnClauseBoundary: true,
  maxMergedLength: 100,
  preferSemanticBoundary: true,
};

// 合并后的hunk
export type MergedHunk =
  | { readonly mode: 'outside'; readonly segments: readonly DiffSegment[] } // 非变更区域
  | { readonly mode: 'hunk'; readonly segments: readonly DiffSegment[] }; // 变更区域

// 判断句末是否为标点
function isSentenceEndChar(ch: string): boolean {
  return '。！？；'.includes(ch) || '.?!'.includes(ch); // 中英文句末标点
}

// 判断文本段落末尾是否为句末标点
function segmentEndsWithSentencePunctuation(text: string): boolean {
  const t = text.trimEnd(); // 去掉末尾空白
  if (t.length === 0) return false; // 空串不算句末
  return isSentenceEndChar(t[t.length - 1]); // 检查最后一个字符
}

// 判断文本是否包含分句边界标点
function containsClauseBoundary(text: string): boolean {
  return /[，,；;：:]/.test(text); // 常见分句标点
}

// 将 token 列表拼回文本
function tokensText(tokens: readonly AiEditToken[]): string {
  return tokens.map((t) => t.value).join(''); // 拼回 token 文本
}

// equal间隔段是否阻止合并（false则允许合并，true则不合并）
function equalGapViolatesMerge(
  oldToks: readonly AiEditToken[],
  newToks: readonly AiEditToken[],
  options: MergeDiffHunksOptions
): boolean {
  const s = tokensText(oldToks); // 等价段在 old 侧文本
  if (options.breakOnNewline && (s.includes('\n') || tokensText(newToks).includes('\n')))
    return true; // 有换行则不合并
  if (s.length > options.maxGapChars || oldToks.length > options.maxGapTokens) return true; // 间隔过大
  if (options.preferSemanticBoundary) {
    if (options.breakOnSentenceEnd && segmentEndsWithSentencePunctuation(s)) return true; // 句末断开
    if (options.breakOnClauseBoundary && containsClauseBoundary(s)) return true; // 分句断开
  }
  return false; // 允许合并
}

// 计算一个 diff segment 的可见长度（equal 取old和new中较长的，delete/insert 取自身）
function segmentVisibleLength(seg: DiffSegment): number {
  if (seg.kind === 'equal')
    return Math.max(tokensText(seg.oldTokens).length, tokensText(seg.newTokens).length); // 对齐段取较长文本
  if (seg.kind === 'delete') return tokensText(seg.oldTokens).length; // 删除段的可见长度
  return tokensText(seg.newTokens).length; // 插入段的可见长度
}

// 计算一系列 diff segments 的总可见长度
function totalVisibleLength(segs: readonly DiffSegment[]): number {
  return segs.reduce((sum, seg) => sum + segmentVisibleLength(seg), 0);
}

// 基于 Intl.Segmenter 的分词
// 把原始文本切分成 AiEditToken 列表，保留每个 token 在原文中的位置
// `\n`单独成一个 token，以便 diff 时能正确处理跨行变更
export function tokenizeForAiEdit(text: string, localeHint?: string): AiEditToken[] {
  const out: AiEditToken[] = []; // 输出 token 列表
  let base = 0; // 当前扫描起点
  while (base < text.length) {
    if (text[base] === '\n') {
      out.push({ value: '\n', start: base, end: base + 1 }); // 单独保留换行
      base += 1;
      continue;
    }
    const nl = text.indexOf('\n', base); // 查找下一处换行
    const lineEnd = nl === -1 ? text.length : nl; // 当前行末尾
    const chunk = text.slice(base, lineEnd); // 取出一行内容
    if (chunk.length > 0) out.push(...tokenizeChunk(chunk, base, localeHint)); // 分词并追加
    base = lineEnd; // 移动到下一行
  }
  return out; // 返回 token 列表
}

function tokenizeChunk(chunk: string, chunkOffset: number, localeHint?: string): AiEditToken[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const seg = new Intl.Segmenter(localeHint ?? 'und', { granularity: 'word' }); // 使用内建分词
      const out: AiEditToken[] = []; // 收集 token
      for (const s of seg.segment(chunk)) {
        if (s.segment.length === 0) continue; // 跳过空段
        const start = chunkOffset + s.index; // 计算全局起点
        out.push({ value: s.segment, start, end: start + s.segment.length }); // 记录 token
      }
      if (out.length > 0) return out; // 有结果就返回
    } catch {
      void 0; // Segmenter 失败就降级
    }
  }
  return tokenizeFallbackAsciiCjk(chunk, chunkOffset); // 回退到自定义分词
}

function isCjkCodePoint(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2ceaf)
  ); // 基础/扩展 CJK 范围
}

function tokenizeFallbackAsciiCjk(chunk: string, offset: number): AiEditToken[] {
  const out: AiEditToken[] = []; // 输出 token
  let i = 0; // 当前游标
  while (i < chunk.length) {
    const c = chunk[i]; // 当前字符
    const cp = c.codePointAt(0); // code point
    const cLen = cp !== undefined && cp > 0xffff ? 2 : 1; // 代理对长度

    if (/\s/.test(c)) {
      let j = i + 1; // 向后合并连续空白
      while (j < chunk.length && /\s/.test(chunk[j])) j += 1;
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j }); // 空白 token
      i = j; // 跳过空白
      continue;
    }
    if (isAsciiDigit(c)) {
      let j = i + 1; // 合并数字序列
      while (j < chunk.length && (isAsciiDigit(chunk[j]) || chunk[j] === '.')) j += 1;
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j }); // 数字 token
      i = j; // 移动游标
      continue;
    }
    if (isAsciiLetter(c)) {
      let j = i + 1; // 合并字母序列
      while (j < chunk.length) {
        if (chunk[j] === '-' && j + 1 < chunk.length && isAsciiLetter(chunk[j + 1])) {
          j += 2; // 允许连字符词
          continue;
        }
        if (isAsciiLetter(chunk[j])) {
          j += 1; // 继续吞并字母
          continue;
        }
        break; // 非字母则停止
      }
      out.push({ value: chunk.slice(i, j), start: offset + i, end: offset + j }); // 字母 token
      i = j; // 移动游标
      continue;
    }
    if (cp !== undefined && isCjkCodePoint(cp)) {
      out.push({ value: chunk.slice(i, i + cLen), start: offset + i, end: offset + i + cLen }); // 单个 CJK
      i += cLen; // 移动游标
      continue;
    }
    out.push({ value: c, start: offset + i, end: offset + i + 1 }); // 其它字符单独成 token
    i += 1; // 移动游标
  }
  return out; // 返回 token 列表
}

function isAsciiDigit(c: string): boolean {
  return c >= '0' && c <= '9'; // ASCII 数字
}

function isAsciiLetter(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); // ASCII 字母
}

type RawOp = {
  readonly k: 'equal' | 'delete' | 'insert'; // 操作类型
  readonly oi: number; // old token 索引
  readonly ni: number; // new token 索引
};

export function diffTokens(
  oldTokens: readonly AiEditToken[],
  newTokens: readonly AiEditToken[]
): DiffSegment[] {
  const n = oldTokens.length; // old token 数
  const m = newTokens.length; // new token 数
  const a = oldTokens.map((t) => t.value); // old token 文本序列
  const b = newTokens.map((t) => t.value); // new token 文本序列
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0)); // LCS 动态规划表
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); // LCS 递推
    }
  }

  const raw: RawOp[] = []; // 回溯得到原始操作序列
  let i = n; // 从末尾回溯
  let j = m; // 从末尾回溯
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ k: 'equal', oi: i - 1, ni: j - 1 }); // 相等
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ k: 'insert', oi: i - 1, ni: j - 1 }); // 插入
      j -= 1;
    } else {
      raw.push({ k: 'delete', oi: i - 1, ni: j - 1 }); // 删除
      i -= 1;
    }
  }
  raw.reverse(); // 反转为正序

  const segments: DiffSegment[] = []; // 合并连续同类操作
  let p = 0; // 遍历 raw
  while (p < raw.length) {
    const k = raw[p].k; // 当前操作类型
    if (k === 'equal') {
      const oStart = raw[p].oi; // old 起点
      const nStart = raw[p].ni; // new 起点
      let len = 0; // 连续长度
      while (p < raw.length && raw[p].k === 'equal') {
        len += 1;
        p += 1;
      }
      segments.push({
        kind: 'equal',
        oldTokens: oldTokens.slice(oStart, oStart + len),
        newTokens: newTokens.slice(nStart, nStart + len),
      });
      continue;
    }
    if (k === 'delete') {
      const oStart = raw[p].oi; // old 起点
      let len = 0; // 连续长度
      while (p < raw.length && raw[p].k === 'delete') {
        len += 1;
        p += 1;
      }
      segments.push({ kind: 'delete', oldTokens: oldTokens.slice(oStart, oStart + len) });
      continue;
    }
    const nStart = raw[p].ni; // new 起点
    let len = 0; // 连续长度
    while (p < raw.length && raw[p].k === 'insert') {
      len += 1;
      p += 1;
    }
    segments.push({ kind: 'insert', newTokens: newTokens.slice(nStart, nStart + len) });
  }
  return segments; // 返回分段结果
}

function coalesceSegments(segs: readonly DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = []; // 结果列表
  for (const s of segs) {
    const prev = out[out.length - 1]; // 前一个段
    if (!prev) {
      out.push(s); // 第一个直接加入
      continue;
    }
    if (s.kind === 'equal' && prev.kind === 'equal') {
      out[out.length - 1] = {
        kind: 'equal',
        oldTokens: [...prev.oldTokens, ...s.oldTokens],
        newTokens: [...prev.newTokens, ...s.newTokens],
      }; // 合并相邻 equal
      continue;
    }
    if (s.kind === 'delete' && prev.kind === 'delete') {
      out[out.length - 1] = { kind: 'delete', oldTokens: [...prev.oldTokens, ...s.oldTokens] }; // 合并 delete
      continue;
    }
    if (s.kind === 'insert' && prev.kind === 'insert') {
      out[out.length - 1] = { kind: 'insert', newTokens: [...prev.newTokens, ...s.newTokens] }; // 合并 insert
      continue;
    }
    out.push(s); // 不同类型则追加
  }
  return out; // 返回合并后结果
}

function splitIntoMergeBlocks(
  segments: readonly DiffSegment[]
): Array<{ kind: 'equal'; seg: DiffSegment } | { kind: 'dirty'; parts: readonly DiffSegment[] }> {
  const blocks: Array<
    { kind: 'equal'; seg: DiffSegment } | { kind: 'dirty'; parts: readonly DiffSegment[] }
  > = []; // 按 equal / dirty 切块
  let i = 0; // 遍历索引
  while (i < segments.length) {
    const s = segments[i]; // 当前段
    if (s.kind === 'equal') {
      blocks.push({ kind: 'equal', seg: s }); // 单独作为 gap
      i += 1;
      continue;
    }
    const parts: DiffSegment[] = []; // 收集连续 dirty 段
    while (i < segments.length && segments[i].kind !== 'equal') {
      parts.push(segments[i]);
      i += 1;
    }
    blocks.push({ kind: 'dirty', parts: coalesceSegments(parts) }); // 合并 dirty 段
  }
  return blocks; // 返回块列表
}

function coalesceAdjacentOutsideHunks(hunks: readonly MergedHunk[]): MergedHunk[] {
  const res: MergedHunk[] = []; // 输出 hunks
  for (const h of hunks) {
    const last = res[res.length - 1]; // 上一个
    if (last && last.mode === 'outside' && h.mode === 'outside') {
      res[res.length - 1] = { mode: 'outside', segments: [...last.segments, ...h.segments] }; // 合并相邻 outside
    } else {
      res.push(h); // 直接追加
    }
  }
  return res; // 返回合并结果
}

export function mergeDiffHunks(
  segments: readonly DiffSegment[],
  options: MergeDiffHunksOptions = DEFAULT_MERGE_DIFF_HUNKS_OPTIONS
): MergedHunk[] {
  if (segments.length === 0) return []; // 空输入直接返回
  const blocks = splitIntoMergeBlocks(segments); // 先切成 equal/dirty 块
  const out: MergedHunk[] = []; // 结果 hunk 列表
  let k = 0; // 遍历块索引
  while (k < blocks.length) {
    const b = blocks[k]; // 当前块
    if (b.kind === 'equal') {
      out.push({ mode: 'outside', segments: [b.seg] }); // equal 块直接 outside
      k += 1;
      continue;
    }
    let parts: DiffSegment[] = [...b.parts]; // 当前 dirty 段
    let visibleLen = totalVisibleLength(parts); // 当前可见长度
    k += 1;
    while (k + 1 < blocks.length && blocks[k].kind === 'equal' && blocks[k + 1].kind === 'dirty') {
      const gapBlock = blocks[k]; // 中间 equal gap
      const nextDirtyBlock = blocks[k + 1]; // 下一个 dirty
      if (gapBlock.kind !== 'equal' || nextDirtyBlock.kind !== 'dirty') break; // 类型保护
      const gap = gapBlock.seg; // gap 段
      if (gap.kind !== 'equal' || equalGapViolatesMerge(gap.oldTokens, gap.newTokens, options))
        break; // gap 不满足合并条件
      const nextVisibleLen =
        visibleLen + segmentVisibleLength(gap) + totalVisibleLength(nextDirtyBlock.parts); // 合并后长度
      if (nextVisibleLen > options.maxMergedLength) break; // 超长则停止
      parts = [...parts, gap, ...nextDirtyBlock.parts]; // 追加 gap + dirty
      visibleLen = nextVisibleLen; // 更新长度
      k += 2; // 跳过 gap 和 next dirty
    }
    out.push({ mode: 'hunk', segments: coalesceSegments(parts) }); // 生成 hunk
  }
  return coalesceAdjacentOutsideHunks(out); // 合并相邻 outside
}

type HunkSpanRole = 'plain' | 'delete' | 'add'; // hunk 内片段角色

type HunkSpan = {
  readonly role: HunkSpanRole; // 片段角色
  readonly text: string; // 片段文本
};

function buildHunkSpans(hunkSegments: readonly DiffSegment[]): {
  spans: HunkSpan[];
  hasDelete: boolean;
  hasAdd: boolean;
} {
  const spans: HunkSpan[] = []; // 片段列表
  let hasDelete = false; // 是否包含删除
  let hasAdd = false; // 是否包含新增

  for (const s of hunkSegments) {
    if (s.kind === 'equal') {
      spans.push({ role: 'plain', text: tokensText(s.oldTokens) }); // 普通文本
    } else if (s.kind === 'delete') {
      spans.push({ role: 'delete', text: tokensText(s.oldTokens) }); // 删除文本
      hasDelete = true;
    } else {
      spans.push({ role: 'add', text: tokensText(s.newTokens) }); // 新增文本
      hasAdd = true;
    }
  }

  return { spans, hasDelete, hasAdd }; // 返回结构
}

function computeDiffData(
  origin: string,
  replace: string,
  mergeOpt: MergeDiffHunksOptions
): { merged: MergedHunk[]; highChangeRatio: boolean } {
  const oldT = tokenizeForAiEdit(origin); // old 分词
  const newT = tokenizeForAiEdit(replace); // new 分词
  const totalTokens = oldT.length + newT.length; // 总 token 数
  const segments = diffTokens(oldT, newT); // 词级 diff

  if (totalTokens > 0) {
    let deleteCount = 0; // 删除 token 数
    let insertCount = 0; // 新增 token 数
    for (const s of segments) {
      if (s.kind === 'delete') deleteCount += s.oldTokens.length;
      else if (s.kind === 'insert') insertCount += s.newTokens.length;
    }
    if ((deleteCount + insertCount) / totalTokens > 0.6) {
      return { merged: [], highChangeRatio: true }; // 变更过大直接走粗粒度
    }
  }

  return { merged: mergeDiffHunks(segments, mergeOpt), highChangeRatio: false }; // 正常合并 hunks
}

export type AiEditJsonUnit =
  | { readonly type: 'plain'; readonly text: string } // 未改动片段
  | { readonly type: 'edit'; readonly origin: string; readonly replace: string }; // 改动片段

export type BuildAiEditJsonUnitsOptions = {
  readonly mergeOptions?: MergeDiffHunksOptions; // 可自定义 hunk 合并策略
};

export function buildAiEditJsonUnits(
  origin: string,
  replace: string,
  options?: BuildAiEditJsonUnitsOptions
): AiEditJsonUnit[] {
  const mergeOpt = options?.mergeOptions ?? DEFAULT_MERGE_DIFF_HUNKS_OPTIONS; // 合并参数
  const { merged, highChangeRatio } = computeDiffData(origin, replace, mergeOpt); // 计算 diff 数据

  if (highChangeRatio) {
    return [{ type: 'edit', origin, replace }]; // 变更过大直接返回整段 edit
  }

  const units: AiEditJsonUnit[] = []; // 输出单元
  for (const h of merged) {
    if (h.mode === 'outside') {
      const text = h.segments
        .map((s) => (s.kind === 'equal' ? tokensText(s.newTokens) : '')) // outside 只保留 equal
        .join('');
      if (text) units.push({ type: 'plain', text }); // 输出 plain 段
      continue;
    }

    const { spans: rawSpans } = buildHunkSpans(h.segments); // 生成 hunk spans
    const originText = rawSpans
      .filter((s) => s.role !== 'add') // old 视角：过滤 add
      .map((s) => s.text)
      .join('');
    const replaceText = rawSpans
      .filter((s) => s.role !== 'delete') // new 视角：过滤 delete
      .map((s) => s.text)
      .join('');
    units.push({ type: 'edit', origin: originText, replace: replaceText }); // 输出 edit 段
  }
  return units; // 返回 JSON units
}
