// spec/app/assistant/chats.md, "A message's words can be selected without opening its actions"
import { type MouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useRef } from "react";

/** Arms a touch hold and returns its cancellation. */
export type MessageHold = (held: () => void) => () => void;

type Caret = { readonly node: Node; readonly offset: number };

function caretAt(document: Document, transcript: Element, x: number, y: number): Caret | undefined {
  const point = document.caretPositionFromPoint?.(x, y);
  const range = point ? undefined : document.caretRangeFromPoint?.(x, y);
  const node = point?.offsetNode ?? range?.startContainer;
  const offset = point?.offset ?? range?.startOffset;
  if (node === undefined || offset === undefined || !node.isConnected || !transcript.contains(node)) return undefined;
  const text = (node instanceof Element ? node : node.parentElement)?.closest("[data-alpha-message-text]");
  return text && transcript.contains(text) ? { node, offset } : undefined;
}

function isLink(target: EventTarget): boolean {
  return target instanceof Element && target.closest("a") !== null;
}

/** Lets the words keep their normal selection and scroll, with a drag owned only after a touch hold. */
export function useMessageText(
  enabled: boolean,
  hold: MessageHold | undefined,
  { toggle, open, close }: { toggle: () => void; open: () => void; close: () => void },
) {
  const contact = useRef<{ claim: () => void; release: () => void } | undefined>(undefined);
  const suppressClick = useRef(false);
  const finish = useCallback(() => {
    const active = contact.current;
    contact.current = undefined;
    active?.release();
  }, []);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node && enabled && hold) return finish;
  }, [enabled, finish, hold]);
  const exposed = (text: HTMLDivElement) => text.isConnected && !text.closest("[hidden], [inert]");
  const selectable = (text: HTMLDivElement) => exposed(text) && text.ownerDocument.getSelection()?.isCollapsed !== false;

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isLink(event.target) && !suppressClick.current && selectable(event.currentTarget)) toggle();
    suppressClick.current = false;
  };
  const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (isLink(event.target) || !selectable(event.currentTarget)) return;
    event.preventDefault();
    suppressClick.current = true;
    if (contact.current) contact.current.claim();
    else open();
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || isLink(event.target)) return;
    finish();
    suppressClick.current = false;
    const { currentTarget: text, clientX: x, clientY: y, pointerId, pointerType } = event;
    if ((pointerType !== "touch" && pointerType !== "pen") || hold === undefined) return;

    const document = text.ownerDocument;
    const transcript = text.closest('[role="log"]') ?? text;
    const listeners = new AbortController();
    const { signal } = listeners;
    const origin = caretAt(document, transcript, x, y);
    let finger: number | undefined;
    let held = false;
    const longPress = () => {
      if (signal.aborted || !selectable(text)) return;
      held = true;
      suppressClick.current = true;
      open();
    };
    const cancelHold = hold(longPress);
    contact.current = { claim: longPress, release: () => { listeners.abort(); cancelHold(); } };

    const moved = (nextX: number, nextY: number, claim: () => void) => {
      if (Math.hypot(nextX - x, nextY - y) <= 8 && document.getSelection()?.isCollapsed !== false) return;
      if (!held || !exposed(text) || !origin?.node.isConnected || !transcript.contains(origin.node)) {
        suppressClick.current = true;
        if (held) close();
        finish();
        return;
      }
      claim();
      const destination = caretAt(document, transcript, nextX, nextY);
      if (destination) document.getSelection()?.setBaseAndExtent(origin.node, origin.offset, destination.node, destination.offset);
      close();
    };

    if (pointerType === "touch") {
      document.addEventListener("touchstart", (touch) => {
        if (touch.touches.length !== 1) finish();
        else finger = touch.touches[0]?.identifier;
      }, { passive: true, signal });
      document.addEventListener("touchmove", (touch) => {
        const point = touch.touches.length === 1 ? touch.touches[0] : undefined;
        if (!point || (finger !== undefined && finger !== point.identifier)) {
          finish();
          return;
        }
        moved(point.clientX, point.clientY, () => { if (touch.cancelable) touch.preventDefault(); });
      }, { passive: false, signal });
      document.addEventListener("touchend", finish, { passive: true, signal });
      document.addEventListener("touchcancel", finish, { passive: true, signal });
    } else document.addEventListener("pointermove", (move) => {
      if (move.pointerId === pointerId) moved(move.clientX, move.clientY, () => move.preventDefault());
    }, { signal });
    const released = (up: PointerEvent) => { if (up.pointerId === pointerId) finish(); };
    document.addEventListener("pointerup", released, { passive: true, signal });
    document.addEventListener("pointercancel", released, { passive: true, signal });
  };

  return enabled ? { ref, onClick, onContextMenu, onPointerDown } : {};
}

interface MessageMenuOptions {
  readonly within?: Element | null;
  readonly dismissOnSelection?: boolean;
}

/** Dismisses an open menu without stealing focus from a selection or another message. */
export function watchMessageMenu(
  menu: HTMLDivElement,
  close: () => void,
  { within = menu.closest("article"), dismissOnSelection = true }: MessageMenuOptions = {},
): () => void {
  const document = menu.ownerDocument;
  const listeners = new AbortController();
  const { signal } = listeners;
  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (target instanceof Node && (menu.contains(target) || within?.contains(target))) return;
    close();
  }, { capture: true, passive: true, signal });
  if (dismissOnSelection) document.addEventListener("selectionchange", () => {
    if (document.getSelection()?.isCollapsed === false) close();
  }, { signal });
  return () => listeners.abort();
}
