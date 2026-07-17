import { ToggleButton, Tooltip } from '@heroui/react';
import { MessagesSquare } from 'lucide-react';
import { useWorkspaceResourceSidePanelStore } from '../../_store/useWorkspaceResourceSidePanelStore';
import styles from './style.module.less';

interface WorkspaceResourceSidePanelActionsProps {
  resourceId: string;
  disabled?: boolean;
  label?: string;
}

function WorkspaceResourceSidePanelActions({
  resourceId,
  disabled,
  label = '评论区',
}: WorkspaceResourceSidePanelActionsProps) {
  const mode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const toggleMode = useWorkspaceResourceSidePanelStore((state) => state.toggleMode);
  return (
    <div className={styles.actions}>
      <Tooltip>
        <Tooltip.Trigger>
          <ToggleButton
            variant="ghost"
            size="sm"
            isIconOnly
            isSelected={mode === 'comment'}
            isDisabled={disabled}
            aria-label={mode === 'comment' ? `收起${label}` : `展开${label}`}
            aria-expanded={mode === 'comment'}
            onChange={() => toggleMode(resourceId, 'comment')}
          >
            <MessagesSquare size={18} aria-hidden="true" />
          </ToggleButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{mode === 'comment' ? `收起${label}` : `打开${label}`}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

export default WorkspaceResourceSidePanelActions;
