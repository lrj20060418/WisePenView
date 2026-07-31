import { useTranslation } from 'react-i18next';

export function useMarketPriceLabel() {
  const { t } = useTranslation('market');
  return (price: number) => t('page.price', { price });
}
