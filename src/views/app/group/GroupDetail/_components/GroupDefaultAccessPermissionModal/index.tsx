import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  TAG_PERMISSION_ACTION_ROWS,
  TAG_PERMISSION_RESOURCE_STRATEGIES,
} from '@/components/Drive/common/tagPermissionPreset';
import styles from '@/components/Drive/Modals/TagPermissionModal/style.module.less';
import AppModal from '@/components/Overlay/AppModal';
import { useGroupService } from '@/domains';
import type { GroupResConfig } from '@/domains/Group';
import {
  buildTagPermissionListActionSelectionPatch,
  isTagPermissionListActionSelected,
  normalizeResourceActions,
  type TagPermissionListAction,
  type TagPermissionPresetKey,
  type TagResourceAction,
} from '@/domains/Tag';
import { parseErrorMessage } from '@/utils/error';
import { Button, Checkbox, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import GroupPolicyShellCard from '../GroupPolicyShellCard';

interface GroupDefaultAccessPermissionModalProps {
  isOpen: boolean;
  groupId: string;
  groupResConfig: GroupResConfig;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function isSameActionSet(
  left: TagResourceAction[] | undefined,
  right: TagResourceAction[] | undefined
): boolean {
  const leftSet = new Set(normalizeResourceActions(left));
  const rightSet = new Set(normalizeResourceActions(right));
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((action) => rightSet.has(action));
}

function resolveActionPresetKey(
  actions: TagResourceAction[]
): Exclude<TagPermissionPresetKey, 'custom'> | 'custom' {
  const matchedPreset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((preset) =>
    isSameActionSet(preset.values.grantedActions, actions)
  );
  return matchedPreset?.key ?? 'custom';
}

function GroupDefaultAccessPermissionModal({
  isOpen,
  groupId,
  groupResConfig,
  onOpenChange,
  onSuccess,
}: GroupDefaultAccessPermissionModalProps) {
  const groupService = useGroupService();
  const [selectedActions, setSelectedActions] = useState<TagResourceAction[]>(() =>
    normalizeResourceActions(groupResConfig.defaultMemberActions)
  );
  const selectedPresetKey = resolveActionPresetKey(selectedActions);

  const { loading: saving, run: runSave } = useRequest(
    async (actions: TagResourceAction[]) => {
      await groupService.updateGroupResConfig({
        groupId,
        defaultMemberActions: normalizeResourceActions(actions),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('小组默认权限已保存');
        onOpenChange(false);
        onSuccess();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    onOpenChange(nextOpen);
  };

  const handlePresetChange = (presetKey: Exclude<TagPermissionPresetKey, 'custom'>) => {
    const preset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((item) => item.key === presetKey);
    if (!preset) return;
    setSelectedActions(normalizeResourceActions(preset.values.grantedActions));
  };

  const handleActionToggle = (action: TagPermissionListAction, checked: boolean) => {
    if (saving) return;
    setSelectedActions((current) => {
      const patch = buildTagPermissionListActionSelectionPatch(
        { grantedActions: current },
        action,
        checked
      );
      return normalizeResourceActions(patch.grantedActions);
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title="访问策略"
      size="lg"
      containerClassName={styles.modalContainer}
      dialogClassName={styles.modalDialog}
      isDismissable={!saving}
      actions={
        <>
          <Button variant="secondary" isDisabled={saving} onPress={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" isPending={saving} onPress={() => runSave(selectedActions)}>
            保存
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.advancedAccessGrid}>
          <GroupPolicyShellCard title="访问名单" />
          <section className={styles.permissionCard} aria-label="资源权限动作">
            <div className={styles.presetBar}>
              <span className={styles.presetLabel}>基于预设</span>
              <div className={styles.presetButtons} role="group" aria-label="基于预设">
                {TAG_PERMISSION_ACTION_PRESET_OPTIONS.map((preset) => (
                  <Button
                    key={preset.key}
                    variant={selectedPresetKey === preset.key ? 'primary' : 'secondary'}
                    size="sm"
                    isDisabled={saving}
                    onPress={() => handlePresetChange(preset.key)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <span className={styles.currentPreset}>
                当前预设：
                {TAG_PERMISSION_ACTION_PRESET_OPTIONS.find(
                  (preset) => preset.key === selectedPresetKey
                )?.label ?? '自定义'}
              </span>
            </div>

            <div className={styles.permissionTableShell}>
              <table className={styles.permissionTable}>
                <thead>
                  <tr>
                    <th className={styles.actionHeader}>权限动作</th>
                    <th className={styles.toggleHeader}>开启</th>
                    {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => (
                      <th key={strategy.key} className={styles.resourceApplicabilityHeader}>
                        {strategy.label}适用
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TAG_PERMISSION_ACTION_ROWS.map((row) => {
                    const selected = isTagPermissionListActionSelected(
                      { grantedActions: selectedActions },
                      row.action
                    );
                    return (
                      <tr key={row.key}>
                        <th className={styles.actionCell}>
                          <span className={styles.actionName}>
                            <ResourcePermissionActionIcon
                              action={row.action.action}
                              className={styles.actionIcon}
                            />
                            <span className={styles.actionText}>{row.label}</span>
                          </span>
                        </th>
                        <td
                          className={styles.permissionToggleCell}
                          onClick={() => handleActionToggle(row.action, !selected)}
                        >
                          <Checkbox
                            className={styles.permissionCheckbox}
                            aria-label={row.label}
                            isDisabled={saving}
                            isSelected={selected}
                            onChange={(isSelected) => handleActionToggle(row.action, isSelected)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => {
                          const supported = row.supportedStrategyKeys.includes(strategy.key);
                          const cellClassName = !supported
                            ? styles.unsupportedCell
                            : selected
                              ? styles.supportedCell
                              : styles.deniedCell;
                          return (
                            <td key={strategy.key} className={cellClassName}>
                              {!supported ? (
                                <span aria-hidden="true">-</span>
                              ) : selected ? (
                                <Check
                                  size={14}
                                  aria-label={`${strategy.label}${row.label}已开启`}
                                  className={styles.permissionStateIcon}
                                />
                              ) : (
                                <X
                                  size={14}
                                  aria-label={`${strategy.label}${row.label}未开启`}
                                  className={styles.permissionStateIcon}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </AppModal>
  );
}

export default GroupDefaultAccessPermissionModal;
