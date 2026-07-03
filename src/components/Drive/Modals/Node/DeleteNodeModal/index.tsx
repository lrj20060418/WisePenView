import { useDriveService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { DeleteNodeModalProps } from './index.type';

function getNodeName(node: DeleteNodeModalProps['node']): string {
  if (!node) return '未命名';
  if (node.type === 'folder') return node.name;
  return node.title;
}

function DeleteNodeModal({ isOpen, node, groupId, onOpenChange, onSuccess }: DeleteNodeModalProps) {
  const driveService = useDriveService();
  const isGroupResource = Boolean(groupId && node && node.type !== 'folder');

  const { loading, run: runDeleteNode } = useRequest(
    async () => {
      if (!node) return;
      await driveService.removeNode({ nodeId: node.id, groupId });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(isGroupResource ? '已从小组移除' : '已移入最近删除');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!node) return;
    runDeleteNode();
  };

  const isFolder = node?.type === 'folder';
  const isPrimaryGroupMount = Boolean(groupId && node?.type === 'resource');
  const nodeName = getNodeName(node);
  const title = isGroupResource ? '从小组移除' : '移入最近删除';
  const description = (() => {
    if (isPrimaryGroupMount) {
      return `「${nodeName}」是当前小组的主挂载文件，移除后会同时解除它在当前小组下的全部挂载关系。确定继续吗？`;
    }
    if (isGroupResource) {
      return `确定从当前小组文件夹移除「${nodeName}」的挂载吗？`;
    }
    if (isFolder) {
      return `确定将「${nodeName}」及其下属内容移入最近删除吗？`;
    }
    return `确定将「${nodeName}」移入最近删除吗？`;
  })();
  const confirmText = isGroupResource ? '移除' : '移入最近删除';

  return (
    <Modal isOpen={isOpen && !!node} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="rounded-medium bg-danger/10 px-4 py-3 text-sm text-danger">
                {description}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button variant="danger" isDisabled={loading} onPress={() => void handleConfirm()}>
                {confirmText}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DeleteNodeModal;
