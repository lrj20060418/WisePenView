import { useCurrentChatSessionStore } from '@/components/ChatPanel/_store/useCurrentChatSessionStore';
import { clearNewChatSessionStore } from '@/components/ChatPanel/_store/useNewChatSessionStore';
import {
  APP_HEADER_NAV_ITEMS,
  APP_HEADER_NAV_KEY,
  resolveAppHeaderNavKey,
  type AppHeaderNavKey,
} from '@/layouts/_common/Sidebar/appSidebarNavigation';
import { ListBox, ListBoxItem } from '@heroui/react';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AppHeaderNavProps } from './index.type';
import styles from './style.module.less';

function AppHeaderNav({ collapsed }: AppHeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const clearCurrentSession = useCurrentChatSessionStore((state) => state.clearCurrentSession);

  const activeNavKey = resolveAppHeaderNavKey(location.pathname);
  const selectedKeys =
    activeNavKey && !(activeNavKey === APP_HEADER_NAV_KEY.CHAT && currentSessionId)
      ? [activeNavKey]
      : [];

  const handleNavItemPress = (navKey: AppHeaderNavKey) => {
    if (navKey === APP_HEADER_NAV_KEY.CHAT) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
    navigate(navKey);
  };

  return (
    <ListBox
      aria-label="应用导航"
      selectionMode="single"
      selectedKeys={selectedKeys}
      className={clsx(styles.headerMenu, collapsed && styles.headerMenuCollapsed)}
    >
      {APP_HEADER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <ListBoxItem
            key={item.key}
            id={item.key}
            textValue={item.label}
            className={clsx(styles.menuItem, collapsed && styles.menuItemCollapsed)}
            onPress={() => handleNavItemPress(item.key)}
          >
            <span className={styles.menuIcon}>
              <Icon size={18} />
            </span>
            {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
          </ListBoxItem>
        );
      })}
    </ListBox>
  );
}

export default AppHeaderNav;
