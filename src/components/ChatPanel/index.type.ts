import type { ChatAgentOption, ChatModel, ChatModelTag } from '@/domains/Chat';
import type { ResourceChatProtocolPort } from './ResourceChatProtocol';

export type ModelTag = ChatModelTag;
export type Model = ChatModel;

export type MessageRole = 'user' | 'ai' | 'system';

export interface ChatPanelProps {
  collapsed: boolean;
  fullWidth?: boolean;
  showHeader?: boolean;
  onNewChat?: () => void;
  resourceChat?: ResourceChatProtocolPort;
  agentDebug?: ChatPanelAgentDebugConfig;
  showCollapseButton?: boolean;
}

export interface ChatPanelAgentDebugConfig {
  agent: ChatAgentOption;
  isDirty: boolean;
  isSaving?: boolean;
  onSaveDraft: () => boolean | Promise<boolean>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // 正文内容

  reasoningContent?: string;
  toolContent?: string;

  createAt: number;
  loading?: boolean;
  error?: boolean;

  meta?: {
    provider?: string;
    modelId?: string;
    modelName?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTime?: number;
    };
  };
}
