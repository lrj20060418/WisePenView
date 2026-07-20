import { codeBlockOptions } from '@blocknote/code-block';

const CODE_BLOCK_THEME = 'github-light';

type CodeHighlighter = Awaited<ReturnType<typeof codeBlockOptions.createHighlighter>>;

/** Shiki token 最小形状（避免直接依赖 @shikijs/types 包路径） */
export type CodeHighlightToken = {
  content: string;
  color?: string;
  fontStyle?: number;
};

let highlighterPromise: Promise<CodeHighlighter> | null = null;

/** 与编辑器共用同一套浅色 Shiki Highlighter（单例）。 */
export async function getCodeBlockHighlighter(): Promise<CodeHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const highlighter = await codeBlockOptions.createHighlighter();
      const getLoadedThemes = highlighter.getLoadedThemes.bind(highlighter);
      highlighter.getLoadedThemes = () => {
        const themes = getLoadedThemes();
        if (!themes.includes(CODE_BLOCK_THEME)) return themes;
        return [CODE_BLOCK_THEME, ...themes.filter((theme) => theme !== CODE_BLOCK_THEME)];
      };
      return highlighter;
    })();
  }
  return highlighterPromise;
}

async function resolveLanguage(highlighter: CodeHighlighter, language: string): Promise<string> {
  const loaded = highlighter.getLoadedLanguages();
  if (loaded.includes(language)) return language;
  try {
    await highlighter.loadLanguage(language as never);
    return language;
  } catch {
    if (!loaded.includes('text')) {
      try {
        await highlighter.loadLanguage('text' as never);
      } catch {
        /* ignore */
      }
    }
    return loaded.includes('text') || highlighter.getLoadedLanguages().includes('text')
      ? 'text'
      : language;
  }
}

/** 按行返回 Shiki tokens；失败时返回空数组，调用方回退纯文本。 */
export async function tokenizeCodeLines(
  code: string,
  language: string
): Promise<CodeHighlightToken[][]> {
  try {
    const highlighter = await getCodeBlockHighlighter();
    const lang = await resolveLanguage(highlighter, language || 'text');
    const result = highlighter.codeToTokens(code, {
      lang: lang as never,
      theme: CODE_BLOCK_THEME,
    });
    return result.tokens as CodeHighlightToken[][];
  } catch {
    return [];
  }
}

/** 把一行 tokens 渲进容器；保留 Shiki 配色。 */
export function renderHighlightedLine(
  container: HTMLElement,
  tokens: readonly CodeHighlightToken[] | undefined,
  fallbackText: string
): void {
  container.classList.add('shiki');
  container.replaceChildren();
  if (!tokens || tokens.length === 0) {
    container.textContent = fallbackText || '\u200B';
    return;
  }
  for (const token of tokens) {
    const span = document.createElement('span');
    span.textContent = token.content;
    if (token.color) {
      span.style.setProperty('color', token.color);
    }
    if (token.fontStyle) {
      // Shiki FontStyle: italic=1, bold=2, underline=4
      if (token.fontStyle & 1) span.style.fontStyle = 'italic';
      if (token.fontStyle & 2) span.style.fontWeight = 'bold';
      if (token.fontStyle & 4) span.style.textDecoration = 'underline';
    }
    container.appendChild(span);
  }
}
