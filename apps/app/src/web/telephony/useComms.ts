// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/comms.md, "A view change while the chat is open keeps the sheet's height and remembers the view it left"; spec/telephony/comms.md, "A proposal restored from the phone's own store is shown, never approved, until Alpha proposes it again"; spec/telephony/drafts.md, "Each subject keeps one request to Alpha, separate from its draft slot"; spec/telephony/common.md, "A question for Alpha leaves the bar only once a turn took it"
import { Effect } from "effect";
import { useMemo } from "react";
import { commsReviewFromAssistant } from "../../assistant/call-facts.vibe";
import { useMachine as useCommsMachine } from "../../../gen/telephony__comms.react.ts";
import { initial as commsInitial, type CommsApp, type Subject } from "../../../gen/telephony__comms.ts";
import { useMachine as useDraftsMachine } from "../../../gen/telephony__drafts.react.ts";
import { initial as draftsInitial } from "../../../gen/telephony__drafts.ts";
import { CallWatch } from "../../telephony/call-bar.vibe";
import { CommsStage, type OpenCard } from "../../telephony/comms.vibe";
import { askFromContacts, askFromList, sendRequest } from "../../telephony/list-ask.vibe";
import { act, answer, now } from "../shell/services.ts";
import { openApp } from "./open.ts";
import { runtime } from "./runtime.ts";

/** The comms stage and the owner's request to Alpha for the subject on screen, with the bar's two targets. */
export function useComms() {
  const comms = useCommsMachine(runtime);
  const drafts = useDraftsMachine(runtime);
  const state = comms.state ?? commsInitial;
  const draftsState = drafts.state ?? draftsInitial;
  const request = draftsState.requests.find((r) => r.subject === state.key)?.request ?? "";
  const openId = state.proposal.tag === "Proposed" ? state.proposal.proposalId : "";
  const live = state.proposal.tag === "Proposed" && state.proposal.live;
  const card = useMemo<OpenCard | null>(
    () => (openId === "" ? null : now(CommsStage.use((s) => s.openCard()), { proposalId: openId, live, words: null })),
    [openId, live],
  );
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
    /** Enter on a Phone or Messages list sentence: Alpha's own filter answers with its line, else the question goes to Alpha and stays in the field until a turn took it (AC-22). */
    askList: (app: "phone" | "messages", text: string, line: (said: string) => void) => {
      if (!text.trim()) return;
      answer(askFromList(app, state.key, text), (said) => {
        if (said !== null) line(said);
      });
    },
    /** Enter on a Contacts list sentence: the question goes to Alpha on this subject and the query stays until a turn took it. */
    askContacts: (text: string) => {
      if (!text.trim()) return;
      act(askFromContacts(state.key, text));
    },
    /** Send the request to Alpha, opening the chat on this subject; it leaves the field once a turn took it, and nothing in it reaches the SMS provider. */
    submitRequest: () => {
      if (!request.trim()) return;
      act(sendRequest(state.key));
    },
    /** End beside the bar (AC-18): ends the call the call bar shows, asked once. */
    endCall: () => act(CallWatch.use((w) => w.endShown())),
    /** The open proposal and its kept words; a restored one is shown and never approved. */
    card,
    /** Approve the open, live proposal: only the owner's tap, staged first, then run once through the assistant's device review, which redraws its chat card. */
    approve: (proposalId: string) =>
      act(Effect.flatMap(CommsStage.use((s) => s.approve(proposalId)), (staged) =>
        staged ? Effect.flatMap(commsReviewFromAssistant(), (review) => review.approve(proposalId)) : Effect.succeed(false))),
    /** Dismiss the open proposal, live or restored; a live one is declined through the assistant's device review, and nothing runs. */
    decline: (proposalId: string) =>
      act(Effect.flatMap(CommsStage.use((s) => s.decline(proposalId)), (staged) =>
        staged ? Effect.flatMap(commsReviewFromAssistant(), (review) => review.decline(proposalId)) : Effect.succeed(false))),
  };
}
