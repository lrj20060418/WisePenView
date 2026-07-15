import { ToggleButton, Tooltip } from '@heroui/react';
import { MessageSquare, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useWorkspaceResourceSidePanelStore } from '../../_store/useWorkspaceResourceSidePanelStore';
import styles from './style.module.less';

interface WorkspaceResourceSidePanelActionsProps {
  resourceId: string;
  annotationAvailable: boolean;
  disabled?: boolean;
}

function WorkspaceResourceSidePanelActions({
  resourceId,
  annotationAvailable,
  disabled,
}: WorkspaceResourceSidePanelActionsProps) {
  const mode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const toggleMode = useWorkspaceResourceSidePanelStore((state) => state.toggleMode);

  return (
    <div className={styles.actions}>
      {annotationAvailable ? (
        <Tooltip>
          <Tooltip.Trigger>
            <ToggleButton
              variant="ghost"
              size="sm"
              isIconOnly
              isSelected={mode === 'annotation'}
              isDisabled={disabled}
              aria-label={mode === 'annotation' ? '收起批注栏' : '展开批注栏'}
              aria-expanded={mode === 'annotation'}
              onChange={() => toggleMode(resourceId, 'annotation')}
            >
              <MessageSquare size={16} aria-hidden="true" />
            </ToggleButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{mode === 'annotation' ? '收起批注栏' : '展开批注栏'}</Tooltip.Content>
        </Tooltip>
      ) : null}
      <Tooltip>
        <Tooltip.Trigger>
          <ToggleButton
            variant="ghost"
            size="sm"
            isIconOnly
            isSelected={mode === 'comment'}
            isDisabled={disabled}
            aria-label={mode === 'comment' ? '收起评论区' : '展开评论区'}
            aria-expanded={mode === 'comment'}
            onChange={() => toggleMode(resourceId, 'comment')}
          >
            {mode === 'comment' ? (
              <PanelRightClose size={16} aria-hidden="true" />
            ) : (
              <PanelRightOpen size={16} aria-hidden="true" />
            )}
          </ToggleButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{mode === 'comment' ? '收起评论区' : '展开评论区'}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

export default WorkspaceResourceSidePanelActions;
