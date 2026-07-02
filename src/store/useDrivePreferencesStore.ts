import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { zustandSessionStorage } from './sessionStorage';

export type DriveViewMode = 'uploadQueue' | 'tableDrive';

const DEFAULT_DRIVE_PREFERENCES = {
  viewMode: 'tableDrive' as DriveViewMode,
};

type DrivePreferencesState = {
  viewMode: DriveViewMode;
  setViewMode: (v: DriveViewMode) => void;
};

export const useDrivePreferencesStore = create<DrivePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRIVE_PREFERENCES,
      setViewMode: (v) => set({ viewMode: v }),
    }),
    { name: 'drive-preferences', storage: zustandSessionStorage }
  )
);
export const clearDrivePreferencesStore = (): void => {
  useDrivePreferencesStore.setState(DEFAULT_DRIVE_PREFERENCES);
  useDrivePreferencesStore.persist.clearStorage();
};
