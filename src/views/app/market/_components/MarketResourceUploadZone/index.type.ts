import type { MarketDriveResourceRef } from '../../mockData';

export interface MarketResourceUploadZoneProps {
  file: File | null;
  driveRef: MarketDriveResourceRef | null;
  disabled?: boolean;
  /** 仅允许从云盘选取（集市发布真实能力） */
  cloudOnly?: boolean;
  accept?: string;
  label: string;
  description: string;
  onFileChange: (file: File | null) => void;
  onDriveRefChange: (ref: MarketDriveResourceRef | null) => void;
}
