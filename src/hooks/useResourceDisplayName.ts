import { useMemo } from 'react';

import { useResourceDisplayNameStore } from '@/store';

export function useResourceDisplayName(
  resourceId: string | undefined,
  fallbackName: string | undefined,
  emptyName: string
): string {
  const stored = useResourceDisplayNameStore((s) =>
    resourceId != null && resourceId !== '' ? s.byResourceId[resourceId] : undefined
  );

  return useMemo(() => {
    const picked = stored?.trim() || fallbackName?.trim() || '';
    return picked === '' ? emptyName : picked;
  }, [stored, fallbackName, emptyName]);
}
