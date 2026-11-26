// spec/app/voice/index.md, "Stop and switch to keyboard shut the conversation down; the keyboard then takes over"
import { type RefObject, useCallback, useRef, useState } from "react";

export type DictationKeyboard = (trigger: HTMLButtonElement, ticket: number, close: () => Promise<boolean>, stillClosed: () => boolean) => void;

interface KeyboardRequest {
  readonly trigger: HTMLButtonElement;
  readonly editor: HTMLTextAreaElement;
  readonly active: Element | null;
  readonly owner: string;
  readonly ticket: number;
  readonly stillClosed: () => boolean;
}

/** Give the still-owned composer focus when it is drawn again after dictation closed for the keyboard. */
export function useTalkKeyboard(composer: RefObject<HTMLTextAreaElement | null>, currentOwner: () => string | undefined) {
  const held = useRef<KeyboardRequest>(undefined);
  const [accepted, accept] = useState<KeyboardRequest>();
  const onDictationKeyboard: DictationKeyboard = (trigger, ticket, close, stillClosed) => {
    const editor = composer.current;
    const owner = currentOwner();
    if (!editor || owner === undefined) {
      void close();
      return;
    }
    if (held.current?.ticket === ticket) return;
    const request = { trigger, editor, active: editor.ownerDocument.activeElement, owner, ticket, stillClosed };
    held.current = request;
    void close().then((allowed) => {
      if (held.current !== request) return;
      if (allowed) accept(request);
      else held.current = undefined;
    });
  };
  const takeFocus = useCallback((editor: HTMLTextAreaElement | null) => {
    const request = held.current;
    if (!editor || !request || request !== accepted) return;
    held.current = undefined;
    if (!request.stillClosed() || request.editor !== editor || !editor.isConnected || editor.disabled || editor.closest("[hidden], [inert]")) return;
    const { activeElement, body, visibilityState } = editor.ownerDocument;
    if (visibilityState === "hidden" || (activeElement !== body && activeElement !== request.active && activeElement !== request.trigger)) return;
    if (request.owner === currentOwner()) editor.focus({ preventScroll: true });
  }, [accepted, currentOwner]);
  return { onDictationKeyboard, takeFocus };
}
