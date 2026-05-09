import { apiGet, apiPost } from '@/apis/_runtime/request';
import type {
  AddNoteApiRequest,
  AddNoteApiResponse,
  GetNoteInfoApiRequest,
  GetNoteInfoApiResponse,
} from './index.type';

function addNote(req: AddNoteApiRequest): Promise<AddNoteApiResponse> {
  return apiPost('/note/addNote', req);
}

function getNoteInfo(req: GetNoteInfoApiRequest): Promise<GetNoteInfoApiResponse> {
  return apiGet('/note/getNoteInfo', { params: req });
}

export const NoteApi = {
  addNote,
  getNoteInfo,
};
