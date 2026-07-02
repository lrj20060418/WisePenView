import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';

export interface WorkspaceHeaderConfig {
  fallbackTo?: string;
  backLabel?: string;
  inlineTitle?: ReactNode;
  extra?: ReactNode;
  titleBlock?: ReactNode;
  className?: string;
  statsResourceId?: string;
}

export interface WorkspaceFooterConfig {
  resourceId: string;
  onRateSuccess?: () => void;
}

export interface WorkspaceLayoutConfig {
  className?: string;
  bodyClassName?: string;
  header?: WorkspaceHeaderConfig | false;
  footer?: WorkspaceFooterConfig | null;
}

export interface WorkspaceOutletContextValue {
  setLayoutConfig: (config: WorkspaceLayoutConfig) => void;
  resetLayoutConfig: () => void;
  renderInteractStats: (resourceId: string) => ReactNode;
}

function useWorkspaceOutletContext() {
  const context = useOutletContext<WorkspaceOutletContextValue | null>();
  if (!context) {
    throw new Error('useWorkspaceOutletContext 必须在 WorkspaceLayout 的 Outlet 内使用');
  }
  return context;
}

export function useWorkspaceLayoutConfig(config: WorkspaceLayoutConfig) {
  const { setLayoutConfig, resetLayoutConfig } = useWorkspaceOutletContext();

  useLayoutEffect(() => {
    setLayoutConfig(config);
    return resetLayoutConfig;
  }, [config, resetLayoutConfig, setLayoutConfig]);
}

export function useWorkspaceInteractStats(resourceId: string) {
  const { renderInteractStats } = useWorkspaceOutletContext();

  return useMemo(() => renderInteractStats(resourceId), [renderInteractStats, resourceId]);
}
