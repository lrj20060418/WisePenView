import styles from '@/components/Drive/Modals/TagPermissionModal/style.module.less';
import { ACCESS_CONTROL_SCOPE } from '@/domains/Tag';
import { Tabs } from '@heroui/react';

interface GroupPolicyShellCardProps {
  title: string;
}

const POLICY_SCOPE_OPTIONS = [
  { scope: ACCESS_CONTROL_SCOPE.ALL, label: '全部' },
  { scope: ACCESS_CONTROL_SCOPE.ONLY_ADMIN, label: '仅管理员' },
  { scope: ACCESS_CONTROL_SCOPE.BLACKLIST, label: '黑名单' },
  { scope: ACCESS_CONTROL_SCOPE.WHITELIST, label: '白名单' },
] as const;

function GroupPolicyShellCard({ title }: GroupPolicyShellCardProps) {
  return (
    <section className={styles.personnelCard} aria-label={title}>
      <div className={styles.personnelHeader}>
        <div className={styles.personnelTitle}>{title}</div>
      </div>
      <Tabs className={styles.scopeTabs} selectedKey={String(ACCESS_CONTROL_SCOPE.ALL)}>
        <Tabs.ListContainer className={styles.scopeTabsListContainer}>
          <Tabs.List className={styles.scopeTabsList} aria-label={`${title}范围`}>
            {POLICY_SCOPE_OPTIONS.map((option) => (
              <Tabs.Tab
                key={option.scope}
                id={String(option.scope)}
                className={styles.scopeTab}
                isDisabled
              >
                {option.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className={styles.memberState}>全部成员</div>
    </section>
  );
}

export default GroupPolicyShellCard;
