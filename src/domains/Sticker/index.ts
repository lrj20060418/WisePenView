// @deprecated Sticker 抽象已雪藏，仅保留历史兼容；Drive 不应再依赖 Sticker 领域。
// 在 flatDrive 中，扁平化的 tag 被抽象为 sticker（贴纸），针对贴纸，我们忽略其树形结构，直接使用扁平化的数据结构。
export type {
  AddStickerRequest,
  DeleteStickerRequest,
  IStickerService,
  Sticker,
  UpdateResourceStickersRequest,
  UpdateStickerRequest,
} from './service/index.type';
