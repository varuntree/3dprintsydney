"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface NavigationContextValue {
  readonly isNavigating: boolean;
  readonly navigatingTo: string | null;
  readonly pendingCount: number;
  navigate: (href: string, options?: { replace?: boolean }) => Promise<void>;
  beginBusy: (target?: string | null) => void;
  endBusy: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  readonly children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  const endBusy = useCallback(() => {
    setPendingCount((count) => {
      const next = Math.max(0, count - 1);
      clearTimer();
      if (next === 0) {
        resetTimer.current = window.setTimeout(() => {
          setNavigatingTo(null);
          clearTimer();
        }, 120);
      }
      return next;
    });
  }, [clearTimer]);

  const beginBusy = useCallback(
    (target?: string | null) => {
      clearTimer();
      setPendingCount((count) => count + 1);
      if (typeof target === "string") {
        setNavigatingTo(target);
      }
    },
    [clearTimer],
  );

  const navigate = useCallback(
    async (href: string, options?: { replace?: boolean }) => {
      beginBusy(href);

      try {
        if (options?.replace) {
          await router.replace(href);
        } else {
          await router.push(href);
        }
      } catch (error) {
        console.error("Navigation error", error);
      } finally {
        window.setTimeout(() => {
          endBusy();
        }, 100);
      }
    },
    [beginBusy, endBusy, router],
  );

  const value = useMemo<NavigationContextValue>(() => {
    return {
      isNavigating: pendingCount > 0,
      navigatingTo,
      pendingCount,
      navigate,
      beginBusy,
      endBusy,
    };
  }, [beginBusy, endBusy, navigate, navigatingTo, pendingCount]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationContext(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigationContext must be used within a NavigationProvider");
  }
  return context;
}
