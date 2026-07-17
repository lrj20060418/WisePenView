import { apiGet, apiPost } from '@/apis/request';

import type {
  AddInlineCommentItemApiRequest,
  ChangeInlineCommentResolveStatusApiRequest,
  CreateInlineCommentApiRequest,
  DeleteInlineCommentItemApiRequest,
  DeleteInlineCommentItemReactionApiRequest,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  SetInlineCommentItemReactionApiRequest,
  UpdateInlineCommentItemApiRequest,
} from './InlineCommentApi.type';

const listInlineComments = (
  req: ListInlineCommentsApiRequest
): Promise<ListInlineCommentsApiResponse> =>
  apiGet(`/resource/inlineComment/listInlineComments`, { params: req });

const createInlineComment = (req: CreateInlineCommentApiRequest): Promise<string> =>
  apiPost(`/resource/inlineComment/createInlineComment`, req);

const addInlineCommentItem = (req: AddInlineCommentItemApiRequest): Promise<string> =>
  apiPost(`/resource/inlineComment/addInlineCommentItem`, req);

const updateInlineCommentItem = (req: UpdateInlineCommentItemApiRequest): Promise<void> =>
  apiPost(`/resource/inlineComment/updateInlineCommentItem`, req);

const setInlineCommentItemReaction = (req: SetInlineCommentItemReactionApiRequest): Promise<void> =>
  apiPost(`/resource/inlineComment/setInlineCommentItemReaction`, req);

const deleteInlineCommentItemReaction = (
  req: DeleteInlineCommentItemReactionApiRequest
): Promise<void> => apiPost(`/resource/inlineComment/deleteInlineCommentItemReaction`, req);

const deleteInlineCommentItem = (req: DeleteInlineCommentItemApiRequest): Promise<void> =>
  apiPost(`/resource/inlineComment/deleteInlineCommentItem`, req);

const changeInlineCommentResolveStatus = (
  req: ChangeInlineCommentResolveStatusApiRequest
): Promise<void> => apiPost(`/resource/inlineComment/changeInlineCommentResolveStatus`, req);

export const InlineCommentApi = {
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  setInlineCommentItemReaction,
  deleteInlineCommentItemReaction,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
};
