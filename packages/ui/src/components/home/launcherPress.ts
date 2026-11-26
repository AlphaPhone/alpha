import { type MouseEvent, type PointerEvent, useRef } from "react";

/** Schedules a long press and returns its cancellation. */
export type LauncherHold = (held: () => void) => () => void;

export const launcherPressSlop = 10;

type Press = { id: number; x: number; y: number; scope: string | undefined; cancel?: () => void };

/** A tile owns its pointer until contact ends or moves; the click that follows a hold has no second action. */
export function useLauncherPress(
  hold: LauncherHold | undefined,
  onHold: (() => void) | undefined,
  onClick: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined,
  scope?: string,
) {
  const pressRef = useRef<Press | undefined>(undefined);
  const consumedScopeRef = useRef<string | symbol | undefined>(undefined);
  const currentScope = scope ?? "";

  const stop = () => {
    pressRef.current?.cancel?.();
    pressRef.current = undefined;
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    if (pressRef.current?.id === event.pointerId) stop();
  };

  return {
    "data-launcher-hold": onHold ? "" : undefined,
    "data-launcher-scope": currentScope,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || event.button !== 0 || event.currentTarget.disabled) return;
      stop();
      consumedScopeRef.current = undefined;
      if (!hold || !onHold) return;
      const button = event.currentTarget;
      const started: Press = { id: event.pointerId, x: event.clientX, y: event.clientY, scope: currentScope };
      pressRef.current = started;
      const cancel = hold(() => {
        if (pressRef.current !== started || !button.isConnected || button.disabled || !button.hasAttribute("data-launcher-hold") || button.dataset.launcherScope !== started.scope || button.closest("[inert]")) return;
        pressRef.current = undefined;
        consumedScopeRef.current = started.scope;
        onHold();
      });
      if (pressRef.current === started) pressRef.current.cancel = cancel;
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = pressRef.current;
      if (start?.id === event.pointerId && (start.scope !== currentScope || Math.hypot(event.clientX - start.x, event.clientY - start.y) > launcherPressSlop)) stop();
    },
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      if (!onHold || event.currentTarget.disabled) return;
      event.preventDefault();
      stop();
      if (consumedScopeRef.current === currentScope) return;
      consumedScopeRef.current = currentScope;
      onHold();
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (consumedScopeRef.current === currentScope && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      } else onClick?.(event);
      consumedScopeRef.current = undefined;
    },
  };
}
