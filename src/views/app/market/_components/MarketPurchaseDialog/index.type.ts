export interface MarketPurchaseDialogProps {
  isOpen: boolean;
  resourceName: string;
  priceLabel: string;
  balanceLabel: string;
  labels: {
    title: string;
    resource: string;
    price: string;
    balance: string;
    hint: string;
    cancel: string;
    confirm: string;
  };
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
