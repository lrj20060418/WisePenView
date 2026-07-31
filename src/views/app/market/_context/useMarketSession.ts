import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { useContext } from 'react';
import { MarketSessionContext, type MarketSessionContextValue } from './marketSessionShared';

export function useMarketSession(): MarketSessionContextValue {
  const ctx = useContext(MarketSessionContext);
  if (!ctx) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: 'useMarketSession must be used within MarketSessionProvider',
    });
  }
  return ctx;
}
