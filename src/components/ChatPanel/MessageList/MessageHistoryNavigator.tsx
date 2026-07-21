import { Popover } from '@/components/Overlay';
import { useMessageScroller, useMessageScrollerVisibility } from '@/components/_shadcn';
import type { WisePenUIMessage } from '@/domains/Chat';
import { Button, ListBox, ListBoxItem, Tooltip } from '@heroui/react';
import { isTextUIPart } from 'ai';
import { List } from 'lucide-react';
import { useState } from 'react';
import styles from './style.module.less';

const MESSAGE_PREVIEW_LENGTH = 72;

interface MessageHistoryNavigatorProps {
  messages: WisePenUIMessage[];
}

interface UserMessageAnchor {
  id: string;
  preview: string;
}

function getMessagePreview(message: WisePenUIMessage): string {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (!text) {
    return message.metadata?.selectedAttachments?.length ? '附件消息' : '空消息';
  }

  return text.length > MESSAGE_PREVIEW_LENGTH
    ? `${text.slice(0, MESSAGE_PREVIEW_LENGTH)}...`
    : text;
}

function MessageHistoryNavigator({ messages }: MessageHistoryNavigatorProps) {
  const [open, setOpen] = useState(false);
  const { scrollToMessage } = useMessageScroller();
  const { currentAnchorId } = useMessageScrollerVisibility();
  const anchors: UserMessageAnchor[] = messages
    .filter((message) => message.role === 'user')
    .map((message) => ({ id: message.id, preview: getMessagePreview(message) }));

  const handleJumpToMessage = (messageId: string) => {
    scrollToMessage(messageId, { behavior: 'smooth', align: 'center' });
    setOpen(false);
  };

  if (anchors.length === 0) return null;

  return (
    <Popover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <Tooltip>
        <Tooltip.Trigger>
          <Popover.Trigger title="跳转到历史提问">
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              className={styles.historyNavigatorTrigger}
              aria-label="跳转到历史提问"
            >
              <List size={18} />
            </Button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>历史提问</Tooltip.Content>
      </Tooltip>
      <Popover.Content className={styles.historyNavigatorPopover} placement="bottom end">
        <Popover.Dialog>
          <div className={styles.historyNavigatorPanel}>
            <div className={styles.historyNavigatorTitle}>历史提问</div>
            <ListBox
              aria-label="历史提问"
              selectionMode="single"
              selectedKeys={currentAnchorId ? [currentAnchorId] : []}
              className={styles.historyNavigatorList}
            >
              {anchors.map((anchor, index) => (
                <ListBoxItem
                  key={anchor.id}
                  id={anchor.id}
                  textValue={anchor.preview}
                  onPress={() => handleJumpToMessage(anchor.id)}
                >
                  <span className={styles.historyNavigatorItem}>
                    <span className={styles.historyNavigatorIndex}>{index + 1}</span>
                    <span className={styles.historyNavigatorPreview}>{anchor.preview}</span>
                  </span>
                </ListBoxItem>
              ))}
            </ListBox>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default MessageHistoryNavigator;
