import { apiGet, apiPost } from '@/apis/request';
import type {
  ListOrdersApiRequest,
  ListOrdersApiResponse,
  MarketOrderApiResponse,
  OffShelfSaleInfoApiRequest,
  PublishSaleInfoApiRequest,
  PurchaseResourceApiRequest,
  SearchMarketResourcesApiRequest,
  SearchMarketResourcesApiResponse,
} from './MarketApi.type';

/** Market API: /resource/search/* + /resource/market/* */
function searchMarketResources(
  req: SearchMarketResourcesApiRequest
): Promise<SearchMarketResourcesApiResponse> {
  return apiGet('/resource/search/searchMarketResources', { params: req });
}

function publishSaleInfo(req: PublishSaleInfoApiRequest): Promise<void> {
  return apiPost('/resource/market/publishSaleInfo', req);
}

function offShelfSaleInfo(req: OffShelfSaleInfoApiRequest): Promise<void> {
  return apiPost('/resource/market/offShelfSaleInfo', req);
}

function purchaseResource(req: PurchaseResourceApiRequest): Promise<MarketOrderApiResponse> {
  return apiPost('/resource/market/purchaseResource', req);
}

function listOrders(req: ListOrdersApiRequest): Promise<ListOrdersApiResponse> {
  return apiGet('/resource/market/listOrders', { params: req });
}

export const MarketApi = {
  searchMarketResources,
  publishSaleInfo,
  offShelfSaleInfo,
  purchaseResource,
  listOrders,
};
