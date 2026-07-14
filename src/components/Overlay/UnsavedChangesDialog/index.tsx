import { Button } from '@heroui/react';

import AppAlertDialog from '../AppAlertDialog';
import type { UnsavedChangesDialogProps } from './index.type';

function UnsavedChangesDialog({
  type = 'confirm',
  isOpen,
  isLoading = false,
  title,
  description,
  cancelText = '取消',
  discardText = '放弃更改',
  confirmText,
  onCancel,
  onDiscard,
  onConfirm,
}: UnsavedChangesDialogProps) {
  const actions = onDiscard ? (
    <>
      <Button variant="secondary" isDisabled={isLoading} onPress={onCancel}>
        {cancelText}
      </Button>
      <Button variant="secondary" isDisabled={isLoading} onPress={onDiscard}>
        {discardText}
      </Button>
      <Button variant="primary" isDisabled={isLoading} aria-busy={isLoading} onPress={onConfirm}>
        {confirmText}
      </Button>
    </>
  ) : undefined;

  return (
    <AppAlertDialog
      type={type}
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open && !isLoading) onCancel();
      }}
      title={title}
      description={description}
      cancelText={cancelText}
      confirmText={confirmText}
      actions={actions}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isConfirmLoading={isLoading}
      isDismissable={!isLoading}
    />
  );
}

export default UnsavedChangesDialog;
