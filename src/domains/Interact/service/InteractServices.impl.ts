import { CommentApi } from '../apis/CommentApi';
import { FavoriteApi } from '../apis/FavoriteApi';
import { InlineCommentApi } from '../apis/InlineCommentApi';
import { InteractApi } from '../apis/InteractApi';
import { InlineCommentServicesMap } from '../mapper/InlineCommentServices.map';
import { InteractServicesMap } from '../mapper/InteractServices.map';
import type {
  AddInlineCommentRequest,
  CommentItemActionRequest,
  CreateCommentRequest,
  CreateFavoriteCollectionRequest,
  CreateInlineCommentThreadRequest,
  CreateReplyRequest,
  DeleteFavoriteCollectionRequest,
  GetInlineCommentChangesRequest,
  GetInlineCommentRequest,
  GetInlineCommentThreadRequest,
  IInteractService,
  ListCommentsRequest,
  ListFavoritedResourcesRequest,
  ListInlineCommentThreadsRequest,
  ListRepliesRequest,
  RateResourceRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from './index.type';

async function getResourceInteraction(resourceId: string) {
  const data = await InteractApi.getUserInteractionRecord({ resourceId });
  return InteractServicesMap.mapResourceInteractionRecordFromApi(data);
}

async function toggleResourceLike(resourceId: string): Promise<void> {
  await InteractApi.toggleLike({ resourceId });
}

async function rateResource(params: RateResourceRequest): Promise<void> {
  await InteractApi.rate(params);
}

async function recordResourceRead(resourceId: string): Promise<void> {
  await InteractApi.read({ resourceId });
}

async function listComments(params: ListCommentsRequest) {
  return InteractServicesMap.mapCommentPageFromApi(await CommentApi.listComments(params));
}

async function listReplies(params: ListRepliesRequest) {
  return InteractServicesMap.mapCommentPageFromApi(await CommentApi.listReplies(params));
}

function createComment(params: CreateCommentRequest): Promise<string> {
  return CommentApi.createComment({ ...params, imageUrls: params.imageUrls ?? [] });
}

function createReply(params: CreateReplyRequest): Promise<string> {
  return CommentApi.createReply({ ...params, imageUrls: params.imageUrls ?? [] });
}

function deleteComment(params: CommentItemActionRequest): Promise<void> {
  return CommentApi.deleteCommentItem(params);
}

function toggleCommentLike(params: CommentItemActionRequest): Promise<boolean> {
  return CommentApi.toggleLike(params);
}

const createInlineCommentThread = async (params: CreateInlineCommentThreadRequest) =>
  InlineCommentServicesMap.mapThread(
    await InlineCommentApi.createThread(InlineCommentServicesMap.mapCreateThreadRequest(params))
  );

const addInlineComment = async (params: AddInlineCommentRequest) =>
  InlineCommentServicesMap.mapComment(
    await InlineCommentApi.addComment(
      params.threadId,
      InlineCommentServicesMap.mapAddCommentRequest(params)
    )
  );

const listInlineCommentThreads = async (params: ListInlineCommentThreadsRequest) =>
  InlineCommentServicesMap.mapThreadsFromApi(
    await InlineCommentApi.listThreads(InlineCommentServicesMap.mapListThreadsRequest(params))
  );

const getInlineCommentThread = async (params: GetInlineCommentThreadRequest) =>
  InlineCommentServicesMap.mapThread(await InlineCommentApi.getThread(params.threadId));

const getInlineComment = async (params: GetInlineCommentRequest) =>
  InlineCommentServicesMap.mapComment(
    await InlineCommentApi.getComment(params.threadId, params.commentId)
  );

const getInlineCommentChanges = async (params: GetInlineCommentChangesRequest) =>
  InlineCommentServicesMap.mapChangesFromApi(await InlineCommentApi.getChanges(params));

const getFavoriteCollectionIds = async (resourceId: string) =>
  InteractServicesMap.mapFavoriteCollectionIdsFromApi(
    await FavoriteApi.getFavoriteStatus(resourceId)
  );

const updateFavoriteCollections = (params: UpdateFavoriteCollectionsRequest): Promise<void> =>
  FavoriteApi.changeFavoriteStatus(InteractServicesMap.mapUpdateFavoriteCollectionsRequest(params));

const listFavoriteCollections = async () =>
  InteractServicesMap.mapFavoriteCollectionsFromApi(await FavoriteApi.listCollections());

const createFavoriteCollection = async (params: CreateFavoriteCollectionRequest): Promise<string> =>
  InteractServicesMap.mapCollectionIdFromApi(
    await FavoriteApi.createCollection(
      InteractServicesMap.mapCreateFavoriteCollectionRequest(params)
    )
  );

const updateFavoriteCollection = (params: UpdateFavoriteCollectionRequest): Promise<void> =>
  FavoriteApi.updateCollectionInfo(InteractServicesMap.mapUpdateFavoriteCollectionRequest(params));

const deleteFavoriteCollection = (params: DeleteFavoriteCollectionRequest): Promise<void> =>
  FavoriteApi.deleteCollection(InteractServicesMap.mapDeleteFavoriteCollectionRequest(params));

const listFavoritedResources = async (params: ListFavoritedResourcesRequest) =>
  InteractServicesMap.mapFavoritedResourcesPageFromApi(
    await FavoriteApi.listFavoritedResources(
      InteractServicesMap.mapListFavoritedResourcesRequest(params)
    )
  );

export const createInteractServices = (): IInteractService => ({
  getResourceInteraction,
  toggleResourceLike,
  rateResource,
  recordResourceRead,
  listComments,
  listReplies,
  createComment,
  createReply,
  deleteComment,
  toggleCommentLike,
  createInlineCommentThread,
  addInlineComment,
  listInlineCommentThreads,
  getInlineCommentThread,
  getInlineComment,
  getInlineCommentChanges,
  getFavoriteCollectionIds,
  updateFavoriteCollections,
  listFavoriteCollections,
  createFavoriteCollection,
  updateFavoriteCollection,
  deleteFavoriteCollection,
  listFavoritedResources,
});
