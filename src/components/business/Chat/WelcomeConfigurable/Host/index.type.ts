import type { ReactNode } from 'react';

import type { WelcomePromptPickMeta, WelcomeScreenConfig } from '../Starter/index.type';

export interface WelcomeScreenHostProps {
  /** 完整屏配置：标题区开关 + starter blocks（blocks 为空则仅 Title） */
  config: WelcomeScreenConfig;
  /** 与 Chat 壳层 welcome 插槽同步 tab 级 welcome_mode（data-welcome-mode） */
  syncLayoutWithShell?: boolean;
  /** 默认 WelcomeTitle；传 null 可显式关闭标题区 */
  hero?: ReactNode | null;
  /** 点击 starter 时写入 Chat 输入框，默认 true（需在 ChatInputStoreProvider 内） */
  prefillChatInput?: boolean;
  /** 额外处理点选；在 prefillChatInput 之后调用 */
  onPromptPick?: (prompt: string, meta: WelcomePromptPickMeta) => void;
}
