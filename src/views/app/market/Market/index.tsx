/**
 * 资料集市布局：顶栏（含搜索）+ 子路由；购物车/草稿由 Session 跨页共享。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import MarketSearchBar from '../_components/MarketSearchBar';
import MarketTopBar from '../_components/MarketTopBar';
import { MarketSessionProvider } from '../_context/MarketSessionContext';
import { useMarketSession } from '../_context/useMarketSession';
import { MARKET_PATH } from '../market.paths';
import page from './style.module.less';

type MarketNavKey = 'browse' | 'myMarket' | 'publish' | 'cart';

function resolveActiveKey(pathname: string): MarketNavKey | 'none' {
  if (pathname.startsWith(MARKET_PATH.mine)) return 'myMarket';
  if (pathname.startsWith(MARKET_PATH.publish)) return 'publish';
  if (pathname.startsWith(MARKET_PATH.cart)) return 'cart';
  if (pathname.startsWith(MARKET_PATH.manage)) return 'none';
  if (pathname.includes('/market/item/')) return 'none';
  return 'browse';
}

function isBrowseSearchPath(pathname: string): boolean {
  return resolveActiveKey(pathname) === 'browse';
}

function MarketLayoutInner() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const { cartItems } = useMarketSession();
  const activeKey = resolveActiveKey(pathname);
  const urlKeyword = searchParams.get('q') ?? '';
  const [draftState, setDraftState] = useState({ key: urlKeyword, value: urlKeyword });
  const draftKeyword = draftState.key === urlKeyword ? draftState.value : urlKeyword;

  const handleSearch = () => {
    const next = draftKeyword.trim();
    const params = new URLSearchParams(search);
    if (next) {
      params.set('q', next);
    } else {
      params.delete('q');
    }
    const query = params.toString();
    navigate({ pathname, search: query ? `?${query}` : '' });
  };

  const searchSlot = isBrowseSearchPath(pathname) ? (
    <MarketSearchBar
      value={draftKeyword}
      placeholder={t('page.searchPlaceholder')}
      ariaLabel={t('page.searchAria')}
      searchButtonLabel={t('page.searchButton')}
      onChange={(value) => setDraftState({ key: urlKeyword, value })}
      onSearch={handleSearch}
    />
  ) : undefined;

  return (
    <div className={page.pageContainer}>
      <MarketTopBar
        discoverLabel={t('page.topBar.discover')}
        myMarketLabel={t('page.topBar.myMarket')}
        publishLabel={t('page.topBar.publish')}
        cartLabel={t('page.topBar.cart')}
        cartCount={cartItems.length}
        activeKey={activeKey === 'none' ? undefined : activeKey}
        navAriaLabel={t('page.topBar.navAria')}
        searchSlot={searchSlot}
        onDiscover={() => navigate(MARKET_PATH.root)}
        onMyMarket={() => navigate(MARKET_PATH.mine)}
        onPublish={() => navigate(MARKET_PATH.publish)}
        onCart={() => navigate(MARKET_PATH.cart)}
      />
      <Outlet />
    </div>
  );
}

function Market() {
  return (
    <MarketSessionProvider>
      <MarketLayoutInner />
    </MarketSessionProvider>
  );
}

export default Market;
