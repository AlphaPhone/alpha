// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/comms.md, "A view change while the chat is open keeps the sheet's height and remembers the view it left"; spec/telephony/drafts.md, "Each subject keeps one request to Alpha, separate from its draft slot"
import { useMachine as useCommsMachine } from "../../../gen/telephony__comms.react.ts";
import { initial as commsInitial, type CommsApp, type Subject } from "../../../gen/telephony__comms.ts";
import { useMachine as useDraftsMachine } from "../../../gen/telephony__drafts.react.ts";
import { initial as draftsInitial } from "../../../gen/telephony__drafts.ts";
import { openApp } from "./open.ts";
import type { TelephonyRuntime } from "./runtime.ts";

/** The comms stage and the owner's request to Alpha for the subject on screen, with the bar's two targets. */
export function useComms(runtime: TelephonyRuntime) {
  const comms = useCommsMachine(runtime);
  const drafts = useDraftsMachine(runtime);
  const state = comms.state ?? commsInitial;
  const draftsState = drafts.state ?? draftsInitial;
  const request = draftsState.requests.find((r) => r.subject === state.key)?.request ?? "";
  return {
    comms: state,
    drafts: draftsState,
    sendDrafts: drafts.send,
    canDrafts: drafts.can,
    request,
    /** The subject on screen changed: while the chat is open the stage remembers the view it left. */
    show: (app: CommsApp, subject: Subject, key: string) => comms.send({ type: "subjectShown", app, subject, key }, "Owner"),
    /** The Alpha button: the chat opens on this subject, addressing Alpha. */
    openAlpha: () => {
      if (comms.can({ type: "alphaOpened" }, "Owner")) comms.send({ type: "alphaOpened" }, "Owner");
      openApp("assistant", `comms:${state.key}`);
    },
    /** The open chat's left slot, or Edit on a draft: back to the person, the chat closed. */
    closeChat: () => comms.can({ type: "chatClosed" }, "Owner") && comms.send({ type: "chatClosed" }, "Owner"),
    /** The owner typed to Alpha. */
    setRequest: (text: string) => drafts.send({ type: "requestTyped", subject: state.key, request: text }, "Owner"),
    /** A list query that reads as a sentence, sent to Alpha on Enter: the chat opens on this subject with it (AC-22). */
    ask: (text: string) => {
      if (!text.trim()) return;
      if (comms.can({ type: "alphaOpened" }, "Owner")) comms.send({ type: "alphaOpened" }, "Owner");
      openApp("assistant", `comms:${state.key}:ask:${encodeURIComponent(text)}`);
    },
    /** Send the request to Alpha in the open chat; nothing in it reaches the SMS provider. */
    submitRequest: () => {
      if (!request.trim()) return;
      openApp("assistant", `comms:${state.key}:ask:${encodeURIComponent(request)}`);
      drafts.send({ type: "requestSent", subject: state.key }, "Owner");
    },
    /** Back: the stage first, then the chat, then the app's own Back (false). */
    back: () => {
      if (comms.can({ type: "stageReturned" }, "Owner")) {
        comms.send({ type: "stageReturned" }, "Owner");
        return true;
      }
      if (comms.can({ type: "chatClosed" }, "Owner")) {
        comms.send({ type: "chatClosed" }, "Owner");
        return true;
      }
      return false;
    },
    /** Approve or decline the open proposal: only the owner's tap. */
    approve: (proposalId: string) => comms.send({ type: "proposalApproved", proposalId }, "Owner"),
    decline: (proposalId: string) => comms.send({ type: "proposalDeclined", proposalId }, "Owner"),
  };
}
