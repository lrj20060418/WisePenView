import { useMarketService } from '@/domains';
import type { MarketSearchHit, MarketSearchScope } from '@/domains/Market';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState } from 'react';

const PAGE_SIZE = 20;

export function useMarketSearchLoadMore(params: {
  ready: boolean;
  keyword: string;
  scope: MarketSearchScope;
  marketGroupId?: string;
}) {
  const marketService = useMarketService();
  const [loadedItems, setLoadedItems] = useState<MarketSearchHit[]>([]);
  const [lastLoadedPage, setLastLoadedPage] = useState(1);
  const loadGenerationRef = useRef(0);

  const {
    data: firstPage,
    loading,
    error,
    refresh: refreshFirstPage,
  } = useRequest(
    () =>
      marketService.searchResources({
        keyword: params.keyword,
        marketGroupId: params.marketGroupId,
        scope: params.scope,
        page: 1,
        size: PAGE_SIZE,
      }),
    {
      ready: params.ready,
      refreshDeps: [
        params.keyword,
        params.scope,
        params.marketGroupId,
        marketService,
        params.ready,
      ],
      onSuccess: () => {
        loadGenerationRef.current += 1;
        setLoadedItems([]);
        setLastLoadedPage(1);
      },
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const { loading: loadingMore, run: loadMore } = useRequest(
    async () => {
      const loadGeneration = loadGenerationRef.current;
      const nextPage = lastLoadedPage + 1;
      const nextResult = await marketService.searchResources({
        keyword: params.keyword,
        marketGroupId: params.marketGroupId,
        scope: params.scope,
        page: nextPage,
        size: PAGE_SIZE,
      });
      if (loadGeneration !== loadGenerationRef.current) return;
      setLoadedItems((items) => [...items, ...nextResult.list]);
      setLastLoadedPage(nextPage);
    },
    {
      manual: true,
      onError: (err) => toast.danger(parseErrorMessage(err)),
    }
  );

  const refresh = () => {
    loadGenerationRef.current += 1;
    setLoadedItems([]);
    setLastLoadedPage(1);
    refreshFirstPage();
  };

  const totalPage = firstPage?.totalPage ?? 0;

  return {
    list: [...(firstPage?.list ?? []), ...loadedItems],
    total: firstPage?.total ?? 0,
    loading,
    loadingMore,
    error,
    hasMore: lastLoadedPage < totalPage,
    loadMore,
    refresh,
  };
}
