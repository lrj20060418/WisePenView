/** 集市默认封面（无真实图时） */
export const MARKET_DEFAULT_COVER = '/market-covers/doc-slate.svg';

const COVERS = [
  '/market-covers/doc-slate.svg',
  '/market-covers/doc-blue.svg',
  '/market-covers/doc-teal.svg',
  '/market-covers/doc-amber.svg',
] as const;

/** 按资源 id 稳定取一张默认封面，避免全站同一 slate */
export function marketCoverForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % COVERS.length;
  }
  return COVERS[hash] ?? MARKET_DEFAULT_COVER;
}
