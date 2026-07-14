import type { ChatAgentOption } from '@/domains/Chat';
import type { VoiceInputProps } from '../VoiceInput';

export interface InputToolbarProps {
  sendDisabled: boolean;
  sending: boolean;
  voiceInputProps: VoiceInputProps;
  injectedAgents?: ChatAgentOption[];
  preferredAgent?: ChatAgentOption | null;
  onSend: () => void;
  onStop?: () => void;
}
