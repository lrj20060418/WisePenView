import { apiPost } from '@/apis/_runtime/request';
import type { ImageUploadApiRequest, ImageUploadApiResponse } from './index.type';

function imageUpload(
  body: ImageUploadApiRequest,
  timeout?: number
): Promise<ImageUploadApiResponse> {
  return apiPost('/storage/imageUpload', body, timeout ? { timeout } : undefined);
}

export const StorageApi = {
  imageUpload,
};
