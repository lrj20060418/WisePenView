import { Empty, Spin } from '@/components/Feedback';
import { useInteractService } from '@/domains';
import type { FavoriteCollection } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import DeleteCollectionModal from './DeleteCollectionModal';
import EditCollectionModal from './EditCollectionModal';
import FavoriteCollectionList from './components/FavoriteCollectionList';
import FavoriteResourceTable from './components/FavoriteResourceTable';
import styles from './style.module.less';

function resolveDefaultCollection(
  collections: FavoriteCollection[]
): FavoriteCollection | undefined {
  return collections.find((collection) => collection.isDefault) ?? collections[0];
}

function FavoritesTab() {
  const interactService = useInteractService();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const [editingCollection, setEditingCollection] = useState<
    FavoriteCollection | null | undefined
  >();
  const [deletingCollection, setDeletingCollection] = useState<FavoriteCollection>();
  const {
    data: collections,
    loading,
    refresh,
  } = useRequest(() => interactService.listFavoriteCollections(), {
    onError: (error) => toast.danger(parseErrorMessage(error)),
  });

  const collectionList = collections ?? [];
  const defaultCollection = resolveDefaultCollection(collectionList);
  const activeCollection =
    collectionList.find((collection) => collection.collectionId === selectedCollectionId) ??
    defaultCollection;

  if (loading && !collections) {
    return <Spin />;
  }

  if (!activeCollection) {
    return <Empty description="暂无收藏夹" />;
  }

  const handleCollectionChanged = () => {
    void refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.favoriteFrame}>
        <div className={styles.splitLayout}>
          <FavoriteCollectionList
            collections={collectionList}
            selectedCollectionId={activeCollection.collectionId}
            onSelect={setSelectedCollectionId}
            onCreate={() => setEditingCollection(null)}
            onEdit={setEditingCollection}
            onDelete={setDeletingCollection}
          />
          <main className={styles.resourcePanel}>
            <FavoriteResourceTable
              key={activeCollection.collectionId}
              collectionId={activeCollection.collectionId}
              collectionName={activeCollection.collectionName ?? '我的收藏'}
              collectionItemCount={activeCollection.itemCount}
              onCollectionChanged={handleCollectionChanged}
              emptyDescription="该收藏夹暂无内容"
            />
          </main>
        </div>
      </div>

      {editingCollection !== undefined ? (
        <EditCollectionModal
          onOpenChange={(open) => {
            if (!open) setEditingCollection(undefined);
          }}
          collection={editingCollection}
          onSuccess={handleCollectionChanged}
        />
      ) : null}
      {deletingCollection ? (
        <DeleteCollectionModal
          collectionId={deletingCollection.collectionId}
          collectionName={deletingCollection.collectionName}
          onOpenChange={(open) => {
            if (!open) setDeletingCollection(undefined);
          }}
          onSuccess={handleCollectionChanged}
        />
      ) : null}
    </div>
  );
}

export default FavoritesTab;
