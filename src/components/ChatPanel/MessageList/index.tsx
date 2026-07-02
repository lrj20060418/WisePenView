import type { Message } from '@/components/ChatPanel/index.type';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from '@/components/_shadcn';
import { useLatest, useUpdateEffect } from 'ahooks';
import { ArrowDown } from 'lucide-react';
import { useRef } from 'react';
import MessageItem from './MessageItem';
import Welcome from './Welcome';
import styles from './style.module.less';

const AUTO_LOAD_EDGE_THRESHOLD = 96;

interface MessageListProps {
  messages: Message[];
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
  onPromptClick?: (text: string) => void;
}

function MessageList({
  messages,
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
  onPromptClick,
}: MessageListProps) {
  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="end"
      scrollEdgeThreshold={AUTO_LOAD_EDGE_THRESHOLD}
      scrollPreviousItemPeek={72}
    >
      <MessageScroller className={styles.container}>
        <MessageScrollerViewport className={styles.viewport}>
          <MessageScrollerContent className={styles.content}>
            {messages.length === 0 ? (
              <MessageScrollerItem className={styles.welcomeItem}>
                <Welcome onPromptClick={onPromptClick} />
              </MessageScrollerItem>
            ) : (
              <>
                <AutoLoadHistory
                  canLoadMoreHistory={canLoadMoreHistory}
                  loadingMoreHistory={loadingMoreHistory}
                  onLoadMoreHistory={onLoadMoreHistory}
                />

                <HistoryLoadingMarker visible={loadingMoreHistory} />

                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === 'ai'}
                  >
                    <MessageItem message={message} />
                  </MessageScrollerItem>
                ))}
              </>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <MessageScrollerButton className={styles.scrollToBottomButton}>
          <ArrowDown size={14} />
          <span className={styles.srOnly}>滚动到底部</span>
        </MessageScrollerButton>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface AutoLoadHistoryProps {
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
}

function AutoLoadHistory({
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
}: AutoLoadHistoryProps) {
  const { start } = useMessageScrollerScrollable();
  const loadMoreRef = useLatest(onLoadMoreHistory);
  const pendingRef = useRef(false);

  useUpdateEffect(() => {
    if (start || !canLoadMoreHistory || loadingMoreHistory || pendingRef.current) return;

    pendingRef.current = true;
    void loadMoreRef.current().finally(() => {
      pendingRef.current = false;
    });
  }, [canLoadMoreHistory, loadingMoreHistory, start]);

  return null;
}

function HistoryLoadingMarker({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <MessageScrollerItem className={styles.loadMoreWrapper}>
      <div className={styles.historyLoadingText}>正在加载更早消息...</div>
    </MessageScrollerItem>
  );
}

export default MessageList;
