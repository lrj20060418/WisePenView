import { create } from 'zustand';

import { registerStore } from '@/store/lifecycle';

export type PendingProgressAnchor = {
  status: string;
  startedAt: number;
  baseProgress: number;
};

type ProgressAnchorsByKey = Record<string, PendingProgressAnchor>;

type UploadQueueProgressState = {
  progressAnchorsByKey: ProgressAnchorsByKey;
  updateProgressAnchors: (updater: (prev: ProgressAnchorsByKey) => ProgressAnchorsByKey) => void;
};

const initialState = {
  progressAnchorsByKey: {} as ProgressAnchorsByKey,
};

export const useUploadQueueProgressStore = create<UploadQueueProgressState>()((set) => ({
  ...initialState,
  updateProgressAnchors: (updater) =>
    set((state) => ({
      progressAnchorsByKey: updater(state.progressAnchorsByKey),
    })),
}));

const resetUploadQueueProgressStore = (): void => {
  useUploadQueueProgressStore.setState(initialState);
};

registerStore({
  id: 'drive-view.upload-queue-progress',
  scope: 'tab',
  reset: resetUploadQueueProgressStore,
});
