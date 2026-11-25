import { type MouseEvent, type PointerEvent, useRef } from "react";

/** Schedules a long press and returns its cancellation. */
export type LauncherHold = (held: () => void) => () => void;

export const launcherPressSlop = 10;

type Press = { id: number; x: number; y: number; cancel?: () => void };

/** A tile owns its pointer until contact ends or moves; the click that follows a hold has no second action. */
export function useLauncherPress(hold: LauncherHold | undefined, onHold: (() => void) | undefined, onClick: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined) {
  const pressRef = useRef<Press | undefined>(undefined);
  const consumedRef = useRef(false);

  const stop = () => {
    pressRef.current?.cancel?.();
    pressRef.current = undefined;
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    if (pressRef.current?.id === event.pointerId) stop();
  };

  return {
    "data-launcher-hold": onHold ? "" : undefined,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      stop();
      consumedRef.current = false;
      if (!hold || !onHold) return;
      const button = event.currentTarget;
      const started = { id: event.pointerId, x: event.clientX, y: event.clientY };
      pressRef.current = started;
      const cancel = hold(() => {
        if (pressRef.current !== started || !button.isConnected || button.disabled || !button.hasAttribute("data-launcher-hold") || button.closest("[inert]")) return;
        pressRef.current = undefined;
        consumedRef.current = true;
        onHold();
      });
      if (pressRef.current === started) pressRef.current.cancel = cancel;
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pressRef.current;
      if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > launcherPressSlop) stop();
    },
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      if (!onHold) return;
      event.preventDefault();
      stop();
      if (consumedRef.current) return;
      consumedRef.current = true;
      onHold();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (consumedRef.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      } else onClick?.(event);
      consumedRef.current = false;
    },
  };
}
