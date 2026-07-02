import { TextArea } from '@heroui/react';
import AttachmentStrip from './AttachmentStrip';
import { ChatInputStoreProvider } from './ChatInputStoreProvider';
import DocumentPickerModal from './DocumentPickerModal';
import DropOverlay from './DropOverlay';
import type { ChatInputProps } from './index.type';
import InputToolbar from './InputToolbar';
import OtherSkillModal from './OtherSkillModal';
import styles from './style.module.less';
import { useChatInputController } from './useChatInputController';

function ChatInputContent({
  onSend,
  sending,
  hasSelectedContext,
  selectedContextText,
  onClearSelectedContext,
}: ChatInputProps) {
  const {
    attachmentStripProps,
    containerProps,
    documentPickerModalProps,
    dropOverlayProps,
    fileInputRef,
    handleFileInputChange,
    otherSkillModalProps,
    textAreaProps,
    toolbarProps,
    workspaceLoading,
  } = useChatInputController({
    onSend,
    sending,
    hasSelectedContext,
    selectedContextText,
    onClearSelectedContext,
  });

  return (
    <div className={styles.container} {...containerProps}>
      <div className={styles.inputCard}>
        <DropOverlay {...dropOverlayProps} />

        <AttachmentStrip {...attachmentStripProps} />

        <TextArea
          {...textAreaProps}
          placeholder="输入消息..."
          rows={1}
          className={styles.textarea}
        />

        <InputToolbar {...toolbarProps} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <OtherSkillModal {...otherSkillModalProps} />

      <DocumentPickerModal {...documentPickerModalProps} />

      <div className={styles.footerTip}>
        {workspaceLoading ? '正在加载可用 Agent' : 'AI 内容仅供参考，请仔细甄别'}
      </div>
    </div>
  );
}

function ChatInput(props: ChatInputProps) {
  return (
    <ChatInputStoreProvider>
      <ChatInputContent {...props} />
    </ChatInputStoreProvider>
  );
}

export default ChatInput;
