import type {
  DocDisplayInfoResponse,
  GetDocInfoRequest,
  IDocumentService,
  OnlyOfficeEditorConfigResponse,
  PendingDocItem,
} from '@/domains/Document';
import { DOCUMENT_PROCESS } from '@/domains/Document';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadDocument: IDocumentService['uploadDocument'] = async (params) => {
  await delay(100);
  const now = Date.now();
  const documentId = `mock-doc-${now}`;
  params.onUploadInitialized?.({
    documentId,
    flashUploaded: false,
  });
  params.onUploadProgress?.(35);
  await delay(100);
  params.onUploadProgress?.(75);
  await delay(100);
  params.onUploadProgress?.(100);
  return documentId;
};

const listPendingDocs = async (): Promise<PendingDocItem[]> => {
  await delay(200);
  return [];
};

const syncPendingDocStatus: IDocumentService['syncPendingDocStatus'] = async (_documentId) => {
  await delay(200);
  return { status: DOCUMENT_PROCESS.READY };
};

const retryPendingDoc = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const cancelPendingDoc = async (_documentId: string): Promise<void> => {
  await delay(200);
};

const getDocInfo = async (
  documentIdOrParams: GetDocInfoRequest | string
): Promise<DocDisplayInfoResponse> => {
  await delay(200);
  const documentId =
    typeof documentIdOrParams === 'string' ? documentIdOrParams : documentIdOrParams.resourceId;
  const offerVersion =
    typeof documentIdOrParams === 'object' ? documentIdOrParams.targetVersion : undefined;
  return {
    docMetaInfo: {
      uploadMeta: {
        documentName: `mock-${documentId}.pdf`,
        uploaderId: '1',
        fileType: 'pdf',
        size: 1024 * 1024 * 2,
      },
      documentStatus: {
        status: 'SUCCESS',
      },
      maxPreviewPages: 20,
      version: offerVersion,
    },
    resourceInfo: {
      resourceId: documentId,
      resourceName: `mock-${documentId}.pdf`,
      ownerInfo: {
        nickname: 'Mock User',
        avatar: '',
        identityType: 0,
      },
      resourceType: 'pdf',
      preview: '这是一份可预览的文档摘要（mock）。',
      likeCount: 12,
      favoriteCount: 4,
      commentCount: 2,
      marketSaleInfos: {
        'mg-1': {
          status: 'PUBLISHED',
          offerVersion: offerVersion ?? 1,
          reviewContentPercentage: 20,
          marketSaleTiers: [{ offerId: 'tier-doc', price: 18 }],
        },
        'mg-cs': {
          status: 'PUBLISHED',
          offerVersion: offerVersion ?? 1,
          reviewContentPercentage: 15,
          marketSaleTiers: [{ offerId: 'tier-doc-2', price: 8 }],
        },
      },
    },
  };
};

const forkDocument: IDocumentService['forkDocument'] = async () => {
  await delay(200);
  return `mock-doc-copy-${Date.now()}`;
};

const getOnlyOfficeEditorConfig = async (
  resourceId: string
): Promise<OnlyOfficeEditorConfigResponse> => {
  await delay(200);
  return {
    sessionId: `mock-office-${resourceId}`,
    config: null,
  };
};

export const DocumentServicesMock: IDocumentService = {
  uploadDocument,
  listPendingDocs,
  syncPendingDocStatus,
  retryPendingDoc,
  cancelPendingDoc,
  getDocInfo,
  forkDocument,
  getOnlyOfficeEditorConfig,
};
