import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import { useInteractService } from '@/domains';
import type { FavoriteItem } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';

interface UnfavoriteResourceModalProps {
  item: FavoriteItem | undefined;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function UnfavoriteResourceModal({ item, onOpenChange, onSuccess }: UnfavoriteResourceModalProps) {
  const interactService = useInteractService();
  const { loading, run: unfavorite } = useRequest(
    () => {
      if (!item) return Promise.resolve();
      return interactService.updateFavoriteCollections({
        resourceId: item.resourceId,
        collectionIds: [],
      });
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('已取消收藏');
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  return (
    <AppAlertDialog
      isOpen={Boolean(item)}
      onOpenChange={onOpenChange}
      type="danger"
      title="取消收藏"
      description={`确定要取消收藏「${item?.resourceInfo?.resourceName ?? '该资源'}」吗？`}
      confirmText="取消收藏"
      isConfirmLoading={loading}
      onConfirm={unfavorite}
    />
  );
}

export default UnfavoriteResourceModal;
