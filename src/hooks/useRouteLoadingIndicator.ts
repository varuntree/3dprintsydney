"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigation } from "./useNavigation";

interface RouteLoadingState {
  visible: boolean;
  progress: number;
}

export function useRouteLoadingIndicator(delay = 180): RouteLoadingState {
  const { isNavigating, pendingCount } = useNavigation();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const delayTimer = useRef<number | null>(null);

  useEffect(() => {
    function cancelFrame() {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }
    function clearDelay() {
      if (delayTimer.current !== null) {
        window.clearTimeout(delayTimer.current);
        delayTimer.current = null;
      }
    }

    function scheduleProgressRamp() {
      cancelFrame();
      frameRef.current = requestAnimationFrame(function tick() {
        setProgress((value) => {
          const next = value + Math.max(0.5, Math.random() * 4);
          return Math.min(next, 90);
        });
        frameRef.current = requestAnimationFrame(tick);
      });
    }

    if (isNavigating || pendingCount > 0) {
      if (visible) {
        scheduleProgressRamp();
      } else if (delayTimer.current === null) {
        delayTimer.current = window.setTimeout(() => {
          setVisible(true);
          setProgress(12);
          scheduleProgressRamp();
        }, delay);
      }
    } else {
      clearDelay();
      cancelFrame();
      if (visible) {
        setProgress(100);
        const timeout = window.setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 220);
        return () => {
          window.clearTimeout(timeout);
        };
      }
    }

    return () => {
      clearDelay();
      cancelFrame();
    };
  }, [delay, isNavigating, pendingCount, visible]);

  return { visible, progress };
}

