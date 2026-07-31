/**
 * 资料集市 · 购物车（确认弹窗 + 余额，与详情购买一致）。
 */
import { useMarketService, useWalletService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MarketCartPanel from '../_components/MarketCartPanel';
import MarketPurchaseDialog from '../_components/MarketPurchaseDialog';
import { useMarketSession } from '../_context/useMarketSession';
import { useMarketPriceLabel } from '../_hooks/useMarketPriceLabel';
import { MARKET_PATH } from '../market.paths';
import page from './style.module.less';

function MarketCart() {
  const { t } = useTranslation('market');
  const navigate = useNavigate();
  const priceLabel = useMarketPriceLabel();
  const marketService = useMarketService();
  const walletService = useWalletService();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const { cartItems, toggleCartItem, toggleCartAll, removeCartItem } = useMarketSession();

  const { data: wallet } = useRequest(() => walletService.getUserWalletInfo(), {
    onError: () => undefined,
  });

  const selected = cartItems.filter((item) => item.selected);
  const selectedTotal = selected.reduce((sum, item) => sum + item.price, 0);
  const balance = wallet?.balance ?? 0;

  const handleCheckout = async () => {
    if (selected.length === 0) return;
    setCheckingOut(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const item of selected) {
        if (!item.marketGroupId || !item.offerId || !item.resourceId) {
          failCount += 1;
          continue;
        }
        try {
          await marketService.purchaseResource({
            resourceId: item.resourceId,
            marketGroupId: item.marketGroupId,
            offerId: item.offerId,
          });
          removeCartItem(item.id);
          successCount += 1;
        } catch {
          failCount += 1;
        }
      }
      setConfirmOpen(false);
      if (successCount > 0) {
        toast.success(t('page.cart.checkoutHint', { count: successCount }));
        navigate(MARKET_PATH.mine);
      }
      if (failCount > 0) {
        toast.danger(t('page.cart.checkoutPartialFail', { count: failCount }));
      }
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className={page.root}>
      <MarketCartPanel
        items={cartItems}
        priceLabel={priceLabel}
        labels={{
          title: t('page.cart.title'),
          subtitle: t('page.cart.subtitleSession'),
          selectAll: t('page.cart.selectAll'),
          remove: t('page.cart.remove'),
          total: t('page.cart.total'),
          checkout: t('page.cart.checkout'),
          empty: t('page.cart.empty'),
          emptyHint: t('page.cart.emptyHint'),
          back: t('page.cart.back'),
          seller: t('page.cart.seller'),
        }}
        onBack={() => navigate(MARKET_PATH.root)}
        onToggleItem={toggleCartItem}
        onToggleAll={toggleCartAll}
        onRemove={removeCartItem}
        onCheckout={() => {
          if (selected.length === 0) return;
          setConfirmOpen(true);
        }}
      />

      <MarketPurchaseDialog
        isOpen={confirmOpen}
        resourceName={
          selected.length === 1
            ? selected[0].resourceName
            : t('page.cart.checkoutItems', { count: selected.length })
        }
        priceLabel={priceLabel(selectedTotal)}
        balanceLabel={t('page.purchase.balanceValue', { balance })}
        labels={{
          title: t('page.purchase.title'),
          resource: t('page.purchase.resource'),
          price: t('page.purchase.price'),
          balance: t('page.purchase.balance'),
          hint: t('page.purchase.hint'),
          cancel: t('page.purchase.cancel'),
          confirm: checkingOut ? t('page.purchase.confirming') : t('page.purchase.confirm'),
        }}
        onOpenChange={(open) => {
          if (!checkingOut) setConfirmOpen(open);
        }}
        onConfirm={() => {
          void handleCheckout();
        }}
      />
    </div>
  );
}

export default MarketCart;
