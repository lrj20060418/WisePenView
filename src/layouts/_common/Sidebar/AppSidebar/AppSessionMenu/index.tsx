import { useChatSessionHistoryRefreshStore } from '@/components/ChatPanel/_store/useChatSessionHistoryRefreshStore';
import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import {
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import { useUpdateEffect } from 'ahooks';
import clsx from 'clsx';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SessionListGroup, { type SessionListGroupRef } from '../SessionListGroup';
import type { AppSessionMenuProps } from './index.type';
import styles from './style.module.less';

function AppSessionMenu({ collapsed }: AppSessionMenuProps) {
  const location = useLocation();
  const sessionListGroupRef = useRef<SessionListGroupRef>(null);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const refreshVersion = useChatSessionHistoryRefreshStore((state) => state.refreshVersion);

  const activeNavKey = resolveAppHeaderNavKey(location.pathname);
  const selectedKeys =
    activeNavKey === APP_HEADER_NAV_KEY.CHAT && currentSessionId
      ? [`session-${currentSessionId}`]
      : [];

  useUpdateEffect(() => {
    void sessionListGroupRef.current?.refresh();
  }, [refreshVersion]);

  return (
    <div
      className={clsx(styles.menuContainer, collapsed && styles.menuContainerCollapsed)}
      aria-hidden={collapsed}
    >
      <SessionListGroup ref={sessionListGroupRef} selectedKeys={selectedKeys} />
    </div>
  );
}

AppSessionMenu.displayName = 'AppSessionMenu';

export default AppSessionMenu;
