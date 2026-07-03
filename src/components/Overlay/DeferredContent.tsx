import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface DeferredOverlayState {
  isOpen: boolean;
  ready: boolean;
  delay: number;
}

type DeferredRenderable = ReactNode | ((state: DeferredOverlayState) => ReactNode);

interface DeferredOverlayContextValue extends DeferredOverlayState {
  enabled: boolean;
}

export interface DeferredOverlayProviderProps {
  children: ReactNode;
  delay: number;
  enabled?: boolean;
  isOpen: boolean;
}

export interface DeferredContentProps {
  children: DeferredRenderable;
  disabled?: boolean;
  fallback?: DeferredRenderable;
}

const DeferredOverlayContext = createContext<DeferredOverlayContextValue | null>(null);

function renderDeferredContent(
  content: DeferredRenderable | undefined,
  state: DeferredOverlayState
): ReactNode {
  if (typeof content === 'function') {
    return content(state);
  }
  return content ?? null;
}

function useDeferredReady(isOpen: boolean, enabled: boolean, delay: number): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled || !isOpen) {
      setReady(false);
      return;
    }

    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => setReady(true));
    }, Math.max(0, delay));

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, enabled, isOpen]);

  return enabled ? ready : isOpen;
}

export function DeferredOverlayProvider({
  children,
  delay,
  enabled = true,
  isOpen,
}: DeferredOverlayProviderProps) {
  const ready = useDeferredReady(isOpen, enabled, delay);
  const value = useMemo<DeferredOverlayContextValue>(
    () => ({
      delay,
      enabled,
      isOpen,
      ready,
    }),
    [delay, enabled, isOpen, ready]
  );

  return <DeferredOverlayContext.Provider value={value}>{children}</DeferredOverlayContext.Provider>;
}

export function DeferredContent({
  children,
  disabled = false,
  fallback = null,
}: DeferredContentProps) {
  const context = useContext(DeferredOverlayContext);
  const state: DeferredOverlayState = {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: disabled || context == null || !context.enabled ? true : context.ready,
  };

  return <>{renderDeferredContent(state.ready ? children : fallback, state)}</>;
}

export function useDeferredOverlayState(): DeferredOverlayState {
  const context = useContext(DeferredOverlayContext);
  return {
    delay: context?.delay ?? 0,
    isOpen: context?.isOpen ?? true,
    ready: context == null || !context.enabled ? true : context.ready,
  };
}
