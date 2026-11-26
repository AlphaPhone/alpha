// spec/app/voice/index.md, "Stop and switch to keyboard shut the conversation down; the keyboard then takes over"
import { type RefObject, useCallback, useRef, useState } from "react";

export type VoiceKeyboard = (trigger: HTMLButtonElement, stop: () => Promise<boolean>) => void;
export type DictationKeyboard = (trigger: HTMLButtonElement, ticket: number, close: () => Promise<boolean>, stillClosed: () => boolean) => void;

export interface TalkStopReceipt {
  readonly session: number;
  readonly confirmed: boolean | undefined;
}

interface KeyboardRequest {
  readonly trigger: HTMLButtonElement;
  readonly editor: HTMLTextAreaElement;
  readonly active: Element | null;
  readonly owner: string;
}

type Handoff = { readonly kind: "talk"; readonly session: number }
  | { readonly kind: "dictation"; readonly ticket: number; readonly stillClosed: () => boolean };
type Request = KeyboardRequest & Handoff;

/** Give the still-owned composer focus when it is drawn again after an accepted and confirmed voice stop. */
export function useTalkKeyboard(
  composer: RefObject<HTMLTextAreaElement | null>,
  currentOwner: () => string | undefined,
  receipt: TalkStopReceipt | undefined,
) {
  const held = useRef<Request>(undefined);
  const [accepted, accept] = useState<Request>();
  const session = receipt?.session;
  const confirmed = receipt?.confirmed;
  const requestFocus = (trigger: HTMLButtonElement, close: () => Promise<boolean>, handoff: Handoff) => {
    const editor = composer.current;
    const owner = currentOwner();
    if (!editor || owner === undefined) {
      void close();
      return;
    }
    const waiting = held.current;
    if (handoff.kind === "talk" && waiting?.kind === "talk" && waiting.session === handoff.session) return;
    if (handoff.kind === "dictation" && waiting?.kind === "dictation" && waiting.ticket === handoff.ticket) return;
    const request = { ...handoff, trigger, editor, active: editor.ownerDocument.activeElement, owner };
    held.current = request;
    void close().then((allowed) => {
      if (held.current !== request) return;
      if (allowed) accept(request);
      else held.current = undefined;
    });
  };
  const onKeyboard: VoiceKeyboard = (trigger, stop) => {
    if (session === undefined) void stop();
    else requestFocus(trigger, stop, { kind: "talk", session });
  };
  const onDictationKeyboard: DictationKeyboard = (trigger, ticket, close, stillClosed) => {
    requestFocus(trigger, close, { kind: "dictation", ticket, stillClosed });
  };
  const takeFocus = useCallback((editor: HTMLTextAreaElement | null) => {
    const request = held.current;
    if (!editor || !request || request !== accepted || (request.kind === "talk" ? confirmed === undefined : confirmed === false)) return;
    held.current = undefined;
    const released = request.kind === "talk" ? confirmed && request.session === session : request.stillClosed();
    if (!released || request.editor !== editor || !editor.isConnected || editor.disabled || editor.closest("[hidden], [inert]")) return;
    const { activeElement, body, visibilityState } = editor.ownerDocument;
    if (visibilityState === "hidden" || (activeElement !== body && activeElement !== request.active && activeElement !== request.trigger)) return;
    if (request.owner === currentOwner()) editor.focus({ preventScroll: true });
  }, [accepted, confirmed, currentOwner, session]);
  return { onKeyboard, onDictationKeyboard, takeFocus };
}
