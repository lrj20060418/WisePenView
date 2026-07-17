export type { CommentAuthor, CommentPage, CommentSortBy, ResourceComment } from './entity/comment';
export type { FavoriteCollection, FavoriteItem, FavoritedResourcesPage } from './entity/favorite';
export type {
  InlineComment,
  InlineCommentAnchor,
  InlineCommentAuthor,
  InlineCommentDraft,
  InlineCommentThread,
  InlineCommentThreadList,
} from './entity/inlineComment';
export type { ResourceInteractionRecord } from './entity/interaction';
export type {
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
  InlineCommentChange,
  InlineCommentChanges,
  ListCommentsRequest,
  ListFavoritedResourcesRequest,
  ListInlineCommentThreadsRequest,
  ListRepliesRequest,
  RateResourceRequest,
  UpdateFavoriteCollectionRequest,
  UpdateFavoriteCollectionsRequest,
} from './service/index.type';
export { InlineCommentSession } from './session/InlineCommentSession';
export type { InlineCommentSessionSnapshot } from './session/InlineCommentSession';
