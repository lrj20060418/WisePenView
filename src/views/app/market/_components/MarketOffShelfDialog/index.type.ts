export interface MarketOffShelfDialogProps {
  isOpen: boolean;
  resourceName: string;
  priceLabel: string;
  auditMessage?: string;
  labels: {
    title: string;
    cancel: string;
    confirm: string;
    resubmit: string;
    effectSearchTitle: string;
    effectSearchDesc: string;
    effectBuyerTitle: string;
    effectBuyerDesc: string;
    rejectExampleTitle: string;
  };
  onOpenChange: (open: boolean) => void;
  onConfirmOffShelf: () => void;
  onResubmit: () => void;
}
