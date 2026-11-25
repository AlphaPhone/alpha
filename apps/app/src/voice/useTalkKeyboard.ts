// spec/app/voice/index.md, "Stop and switch to keyboard shut the conversation down; the keyboard then takes over"
import { type RefObject, useCallback, useRef, useState } from "react";

export type VoiceKeyboard = (trigger: HTMLButtonElement, stop: () => Promise<boolean>) => void;

export interface TalkStopReceipt {
  readonly session: number;
  readonly confirmed: boolean | undefined;
}

interface KeyboardRequest {
  readonly trigger: HTMLButtonElement;
  readonly editor: HTMLTextAreaElement;
  readonly active: Element | null;
  readonly owner: string;
  readonly session: number;
}

/** Give the composer focus when it is drawn again after an accepted and confirmed Talk stop. */
export function useTalkKeyboard(
  composer: RefObject<HTMLTextAreaElement | null>,
  currentOwner: () => string | undefined,
  receipt: TalkStopReceipt | undefined,
) {
  const held = useRef<KeyboardRequest>(undefined);
  const [accepted, accept] = useState<number>();
  const session = receipt?.session;
  const confirmed = receipt?.confirmed;
  const onKeyboard: VoiceKeyboard = (trigger, stop) => {
    const editor = composer.current;
    const owner = currentOwner();
    if (!editor || session === undefined || owner === undefined) {
      void stop();
      return;
    }
    if (held.current?.session === session) return;
    const request = { trigger, editor, active: editor.ownerDocument.activeElement, owner, session };
    held.current = request;
    void stop().then((allowed) => {
      if (held.current !== request) return;
      if (allowed) accept(request.session);
      else held.current = undefined;
    });
  };
  const takeFocus = useCallback((editor: HTMLTextAreaElement | null) => {
    const request = held.current;
    if (!editor || !request || request.session !== accepted || confirmed === undefined) return;
    held.current = undefined;
    if (!confirmed || request.session !== session || request.editor !== editor || !editor.isConnected || editor.disabled || editor.closest("[hidden], [inert]")) return;
    const { activeElement, body, visibilityState } = editor.ownerDocument;
    if (visibilityState === "hidden" || (activeElement !== body && activeElement !== request.active && activeElement !== request.trigger)) return;
    if (request.owner === currentOwner()) editor.focus({ preventScroll: true });
  }, [accepted, confirmed, currentOwner, session]);
  return { onKeyboard, takeFocus };
}
