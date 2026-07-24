import styles from '@/components/Drive/Modals/TagPermissionModal/style.module.less';
import AppModal from '@/components/Overlay/AppModal';
import { Button } from '@heroui/react';
import GroupPolicyShellCard from '../GroupPolicyShellCard';

interface GroupMountPermissionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function GroupMountPermissionModal({ isOpen, onOpenChange }: GroupMountPermissionModalProps) {
  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="挂载策略"
      size="lg"
      containerClassName={styles.mountModalContainer}
      dialogClassName={styles.mountModalDialog}
      actions={
        <>
          <Button variant="secondary" onPress={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="primary" isDisabled>
            保存
          </Button>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        <div className={styles.advancedMountGrid}>
          <GroupPolicyShellCard title="挂载名单" />
        </div>
      </div>
    </AppModal>
  );
}

export default GroupMountPermissionModal;
