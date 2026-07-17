import type { IResourceService } from '@/domains/Resource';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { InlineCommentApi } from '../apis/InlineCommentApi';
import { NoteApi } from '../apis/NoteApi';
import { InlineCommentServicesMap } from '../mapper/InlineCommentServices.map';
import { NoteServicesMap } from '../mapper/NoteServices.map';
import type {
  AddInlineCommentRequest,
  CreateInlineCommentThreadRequest,
  CreateNoteRequest,
  CreateNoteResponse,
  DrawIoLatestSnapshotData,
  ForkNoteRequest,
  ForkNoteResponse,
  GetDrawIoLatestSnapshotRequest,
  GetInlineCommentChangesRequest,
  GetInlineCommentRequest,
  GetInlineCommentThreadRequest,
  GetNoteInfoRequest,
  INoteService,
  ListInlineCommentThreadsRequest,
  ListNoteVersionsRequest,
  NoteInfoDisplayData,
  NoteVersionListPage,
  SaveDrawIoSnapshotRequest,
  SyncTitleRequest,
} from './index.type';

interface NoteServicesDeps {
  resourceService: IResourceService;
}

const createNote = async (params: CreateNoteRequest): Promise<CreateNoteResponse> => {
  const resourceId = await NoteApi.addNote(NoteServicesMap.mapCreateNoteRequest(params));
  return NoteServicesMap.mapCreateNoteFromApi(resourceId);
};

const getNoteInfoDisplay = async (params: GetNoteInfoRequest): Promise<NoteInfoDisplayData> => {
  const noteInfoData = await NoteApi.getNoteInfo(params);
  if (!noteInfoData?.resourceInfo) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_NOT_FOUND);
  }
  return NoteServicesMap.mapNoteInfoDisplayFromApi(noteInfoData);
};

const getDrawIoLatestSnapshot = async (
  params: GetDrawIoLatestSnapshotRequest
): Promise<DrawIoLatestSnapshotData> => {
  const data = await NoteApi.getDrawIoLatestSnapshot(params);
  return NoteServicesMap.mapDrawIoLatestSnapshotFromApi(data, params.resourceId);
};

const saveDrawIoSnapshot = async (params: SaveDrawIoSnapshotRequest): Promise<void> => {
  await NoteApi.saveDrawIoSnapshot(NoteServicesMap.mapSaveDrawIoSnapshotRequest(params));
};

const forkNote = async (params: ForkNoteRequest): Promise<ForkNoteResponse> => {
  const resourceId = await NoteApi.forkNote(params);
  return NoteServicesMap.mapForkNoteFromApi(resourceId);
};

const listNoteVersions = async (params: ListNoteVersionsRequest): Promise<NoteVersionListPage> => {
  const data = await NoteApi.listNoteVersions(params);
  return NoteServicesMap.mapNoteVersionListPageFromApi(data);
};

const createInlineCommentThread = async (params: CreateInlineCommentThreadRequest) => {
  const data = await InlineCommentApi.createThread(
    InlineCommentServicesMap.mapCreateThreadRequest(params)
  );
  return InlineCommentServicesMap.mapThread(data);
};

const addInlineComment = async (params: AddInlineCommentRequest) => {
  const data = await InlineCommentApi.addComment(
    params.threadId,
    InlineCommentServicesMap.mapAddCommentRequest(params)
  );
  return InlineCommentServicesMap.mapComment(data);
};

const listInlineCommentThreads = async (params: ListInlineCommentThreadsRequest) => {
  const data = await InlineCommentApi.listThreads(
    InlineCommentServicesMap.mapListThreadsRequest(params)
  );
  return InlineCommentServicesMap.mapThreadsFromApi(data);
};

const getInlineCommentThread = async (params: GetInlineCommentThreadRequest) =>
  InlineCommentServicesMap.mapThread(await InlineCommentApi.getThread(params.threadId));

const getInlineComment = async (params: GetInlineCommentRequest) => {
  const data = await InlineCommentApi.getComment(params.threadId, params.commentId);
  return InlineCommentServicesMap.mapComment(data);
};

const getInlineCommentChanges = async (params: GetInlineCommentChangesRequest) =>
  InlineCommentServicesMap.mapChangesFromApi(await InlineCommentApi.getChanges(params));

export const createNoteServices = (deps: NoteServicesDeps): INoteService => {
  const { resourceService } = deps;

  // syncTitle 是 resource 的工作，但语义上属于 note 服务
  const syncTitle = async (params: SyncTitleRequest): Promise<void> => {
    const payload = NoteServicesMap.mapSyncTitleRequest(params);
    await resourceService.renameResource(payload);
  };

  return {
    syncTitle,
    createNote,
    getNoteInfoDisplay,
    getDrawIoLatestSnapshot,
    saveDrawIoSnapshot,
    forkNote,
    listNoteVersions,
    createInlineCommentThread,
    addInlineComment,
    listInlineCommentThreads,
    getInlineCommentThread,
    getInlineComment,
    getInlineCommentChanges,
  };
};
