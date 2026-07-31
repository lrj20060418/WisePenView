import { useResourceService } from '@/domains';
import type { ResourceItem } from '@/domains/Resource';
import { RESOURCE_SORT_BY, RESOURCE_SORT_DIR, TAG_QUERY_LOGIC_MODE } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useRef, useState } from 'react';

const PAGE_SIZE = 20;

export function useMarketFolderResourcesLoadMore(params: {
  ready: boolean;
  groupId?: string;
  folderId?: string;
}) {
  const resourceService = useResourceService();
  const [loadedItems, setLoadedItems] = useState<ResourceItem[]>([]);
  const [lastLoadedPage, setLastLoadedPage] = useState(1);
  const loadGenerationRef = useRef(0);

  const fetchPage = (page: number) =>
    resourceService.getGroupResources({
      groupId: params.groupId as string,
      page,
      size: PAGE_SIZE,
      sortBy: RESOURCE_SORT_BY.UPDATE_TIME,
      sortDir: RESOURCE_SORT_DIR.DESC,
      tagIds: params.folderId ? [params.folderId] : undefined,
      tagQueryLogicMode: TAG_QUERY_LOGIC_MODE.AND,
    });

  const {
    data: firstPage,
    loading,
    error,
    refresh: refreshFirstPage,
  } = useRequest(() => fetchPage(1), {
    ready: params.ready && Boolean(params.groupId),
    refreshDeps: [params.groupId, params.folderId, resourceService, params.ready],
    onSuccess: () => {
      loadGenerationRef.current += 1;
      setLoadedItems([]);
      setLastLoadedPage(1);
    },
    onError: (err) => toast.danger(parseErrorMessage(err)),
  });

  const { loading: loadingMore, run: loadMore } = useRequest(
    async () => {
      const loadGeneration = loadGenerationRef.current;
      const nextPage = lastLoadedPage + 1;
      const nextResult = await fetchPage(nextPage);
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
