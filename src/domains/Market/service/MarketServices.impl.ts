import type { IDocumentService } from '@/domains/Document';
import type { INoteService } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { MarketApi } from '../apis/MarketApi';
import type { MarketOrder, MarketResourceDetail } from '../entity/market';
import { MarketServicesMap } from '../mapper/MarketServices.map';
import type {
  GetMarketResourceDetailRequest,
  IMarketService,
  ListOrdersRequest,
  ListOrdersResult,
  OffShelfSaleInfoRequest,
  PublishSaleInfoRequest,
  PurchaseResourceRequest,
  SearchMarketResourcesRequest,
  SearchMarketResourcesResult,
} from './index.type';

interface MarketServicesDeps {
  noteService: INoteService;
  documentService: IDocumentService;
}

const searchResources = async (
  params: SearchMarketResourcesRequest
): Promise<SearchMarketResourcesResult> => {
  const query = MarketServicesMap.mapSearchMarketResourcesRequest(params);
  const payload = await MarketApi.searchMarketResources(query);
  return MarketServicesMap.mapSearchMarketResourcesFromApi(payload);
};

export const createMarketServices = (deps: MarketServicesDeps): IMarketService => {
  const { noteService, documentService } = deps;

  const getResourceDetail = async (
    params: GetMarketResourceDetailRequest
  ): Promise<MarketResourceDetail> => {
    const preferNote =
      params.resourceType == null || MarketServicesMap.isMarketNoteLikeType(params.resourceType);

    const tryNote = async (): Promise<MarketResourceDetail> => {
      const note = await noteService.getNoteInfoDisplay({
        resourceId: params.resourceId,
        ...(params.offerVersion != null ? { targetVersion: params.offerVersion } : {}),
      });
      if (!note.resourceInfo) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
      }
      return MarketServicesMap.mapResourceDetailFromResourceItem(params, note.resourceInfo, {
        title: note.noteTitle,
        updateTime: note.lastEditedAtText,
        authors: note.authors.map((author) => author.name || ''),
      });
    };

    const tryDoc = async (): Promise<MarketResourceDetail> => {
      const doc = await documentService.getDocInfo({
        resourceId: params.resourceId,
        ...(params.offerVersion != null ? { targetVersion: params.offerVersion } : {}),
      });
      return MarketServicesMap.mapResourceDetailFromResourceItem(params, doc.resourceInfo, {
        title: doc.resourceInfo.resourceName,
        authors: Object.values(doc.authorsDisplay ?? {}).map(
          (user) => user.nickname ?? user.realName ?? ''
        ),
      });
    };

    if (params.resourceType != null) {
      return preferNote ? tryNote() : tryDoc();
    }

    try {
      return await tryNote();
    } catch {
      return tryDoc();
    }
  };

  const publishSaleInfo = async (params: PublishSaleInfoRequest): Promise<void> => {
    await MarketApi.publishSaleInfo(MarketServicesMap.mapPublishSaleInfoRequest(params));
  };

  const offShelfSaleInfo = async (params: OffShelfSaleInfoRequest): Promise<void> => {
    await MarketApi.offShelfSaleInfo(MarketServicesMap.mapOffShelfSaleInfoRequest(params));
  };

  const purchaseResource = async (params: PurchaseResourceRequest): Promise<MarketOrder> => {
    const data = await MarketApi.purchaseResource(
      MarketServicesMap.mapPurchaseResourceRequest(params)
    );
    return MarketServicesMap.mapOrderFromApi(data);
  };

  const listOrders = async (params: ListOrdersRequest): Promise<ListOrdersResult> => {
    const data = await MarketApi.listOrders(params);
    return MarketServicesMap.mapListOrdersFromApi(data);
  };

  return {
    searchResources,
    getResourceDetail,
    publishSaleInfo,
    offShelfSaleInfo,
    purchaseResource,
    listOrders,
  };
};
