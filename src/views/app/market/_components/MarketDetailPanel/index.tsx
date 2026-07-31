import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { Button, Chip } from '@heroui/react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import type { MarketDetailPanelProps } from './index.type';
import styles from './style.module.less';

function MarketDetailPanel({
  isOpen,
  detail,
  priceLabel,
  onOpenChange,
  onPurchase,
  onAddToCart,
  onToggleLike,
  onToggleFavorite,
  liked,
  favorited,
  labels,
}: MarketDetailPanelProps) {
  const ownerName = detail.ownerInfo.nickname || detail.ownerInfo.realName || '—';
  const ownerInitial = ownerName.slice(0, 1);
  const authorIntro = detail.ownerInfo.bio?.trim() || detail.description?.trim() || '';
  const showComments = detail.comments > 0;

  return (
    <AppDisplayDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.title}
      size="cover"
      closeText={false}
      containerClassName={styles.container}
      dialogClassName={styles.dialog}
      bodyClassName={styles.body}
      footerClassName={styles.footer}
      footer={
        <div className={styles.footerActions}>
          <div className={styles.secondaryActions}>
            <Button variant={liked ? 'primary' : 'secondary'} onPress={onToggleLike}>
              <Heart size={16} aria-hidden="true" />
              {labels.like}
              {detail.likes > 0 ? ` · ${detail.likes}` : ''}
            </Button>
            <Button variant={favorited ? 'primary' : 'secondary'} onPress={onToggleFavorite}>
              <Star size={16} aria-hidden="true" />
              {labels.favorite}
              {detail.favorites > 0 ? ` · ${detail.favorites}` : ''}
            </Button>
            <Button variant="secondary" onPress={onAddToCart}>
              <ShoppingCart size={16} aria-hidden="true" />
              {labels.addToCart}
            </Button>
          </div>
          <Button variant="primary" className={styles.purchaseButton} onPress={onPurchase}>
            {labels.purchase}
          </Button>
        </div>
      }
    >
      <div className={styles.layout}>
        <aside className={styles.leftPane}>
          {detail.marketSaleInfo.status === 'PUBLISHED' ? (
            <Chip size="sm" variant="soft" className={styles.onSaleChip}>
              <Chip.Label>{labels.onSale}</Chip.Label>
            </Chip>
          ) : null}
          <div className={styles.coverCard}>
            {detail.coverImageUrl ? (
              <img className={styles.coverImage} src={detail.coverImageUrl} alt="" />
            ) : (
              <div className={styles.coverPlaceholder} aria-hidden="true" />
            )}
            <div className={styles.coverOverlay}>
              <p className={styles.coverTitle}>{detail.resourceName}</p>
              {detail.ownerInfo.college ? (
                <span className={styles.collegeSeal}>{detail.ownerInfo.college}</span>
              ) : null}
            </div>
          </div>
          {detail.preview ? <p className={styles.previewText}>{detail.preview}</p> : null}
        </aside>

        <div className={styles.rightPane}>
          <div className={styles.titleRow}>
            <h3 className={styles.resourceName}>{detail.resourceName}</h3>
            <span className={styles.priceBadge}>{priceLabel}</span>
          </div>

          <div className={styles.authorRow}>
            <span className={styles.avatar} aria-hidden="true">
              {ownerInitial}
            </span>
            <div>
              <p className={styles.authorName}>{ownerName}</p>
              <p className={styles.authorMeta}>
                {detail.ownerInfo.college}
                {detail.updateTime ? ` · ${labels.updatedAt} ${detail.updateTime}` : null}
              </p>
            </div>
          </div>

          {authorIntro || detail.tags.length > 0 ? (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>
                {authorIntro ? labels.authorIntro : labels.tags}
              </h4>
              {authorIntro ? <p className={styles.description}>{authorIntro}</p> : null}
              {detail.tags.length > 0 ? (
                <div className={styles.tags}>
                  {detail.tags.map((tag) => (
                    <Chip key={tag} size="sm" variant="soft">
                      <Chip.Label>{tag}</Chip.Label>
                    </Chip>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>
              {showComments ? `${labels.comments} · ${labels.commentCount}` : labels.comments}
            </h4>
            {showComments ? null : <p className={styles.emptyComments}>{labels.noComments}</p>}
          </section>

          <p className={styles.offerHint}>{labels.offerHint}</p>
        </div>
      </div>
    </AppDisplayDialog>
  );
}

export default MarketDetailPanel;
