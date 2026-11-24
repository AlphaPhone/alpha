// spec/assistant/index.md, "Story: Ask my assistant from anywhere"
import { Effect } from "effect";
import { act, ask, readNow } from "../shell/services.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { ChatAttachments } from "../../assistant/attachments.vibe";
import { Composer } from "../../assistant/composer.vibe";
import { AssistantDraft } from "../../assistant/draft.vibe";
import { ChatSearch } from "../../assistant/search.vibe";
import { AssistantHost } from "../../assistant/host.vibe";
import { AssistantEmail } from "../../assistant/ports.vibe";
import { AgentRestart, type RestartOffer } from "../../assistant/restart.vibe";
import { Navigation } from "../../shell/navigation.vibe";

/** The composer's transcript stream. */
export const transcriptStream = Effect.map(Effect.service(Composer), (composer) => composer.transcript);
/** The composer's reply or edit target. */
export const targetStream = Effect.map(Effect.service(Composer), (composer) => composer.target);
/** The files waiting in the composer. */
export const filesStream = Effect.map(Effect.service(ChatAttachments), (files) => files.changes);
/** The hits of chat search. */
export const hitsStream = Effect.map(Effect.service(ChatSearch), (search) => search.hits);
/** The question review open now. */
export const reviewStream = Effect.map(Effect.service(AssistantDraft), (draft) => draft.review);
/** Where inference runs, read once per mount. */
export const inferenceOf = () => readNow(Effect.flatMap(Effect.service(AssistantHost), (host) => host.inference()));
/** The selected Inbox account's address, for an email card's "me". */
export const ownAddressNow = () => readNow(Effect.flatMap(Effect.service(AssistantEmail), (mail) => mail.address()));
/** Whether an emergency call is live now. */
export const emergencyNow = () => readNow(Effect.flatMap(Effect.service(AssistantHost), (host) => host.emergency()));
/** What a refused agent is offered: Restart Alpha over a hold for review, Try again when nothing is held, or nothing. */
export const restartStream = Effect.map(Effect.service(AgentRestart), (restart) => restart.offered);
/** Nothing offered, before the first offer is read. */
export const noOffer: RestartOffer = { kind: "none" };
/** Whether a restart of the agent is running. */
export const restartBusyStream = Effect.map(Effect.service(AgentRestart), (restart) => restart.busy);
/** The open draft as voice dictation fills it. */
export const dictationTargetNow = () => readNow(Effect.flatMap(Effect.service(Composer), (composer) => composer.dictationTarget()));
/** The assistant's own route the shell shows now, or "" off the assistant. */
const routeNow = Effect.map(Effect.flatMap(Effect.service(Navigation), (navigation) => navigation.get()),
  (nav) => nav.app === "assistant" ? nav.places.find((place) => place.app === "assistant")?.route ?? "" : "");

/** Open an app view from the full assistant screen, keeping the chat's detent. */
export const openFromAssistant = (app: string, route?: string) =>
  act(Effect.flatMap(Effect.service(AssistantHost), (host) => host.openView(app, route)));

/** Leave Agent activity for the conversation. */
export const leaveActivity = () => act(Effect.flatMap(Effect.service(Navigation), (navigation) => navigation.open("assistant", "")));

/** Back while the assistant is in front: Agent activity, then a question review, then search, then a reply or edit aim; false when Back is the shell's. */
export const assistantBack = (): Promise<boolean> =>
  ask(Effect.gen(function* () {
    if ((yield* routeNow) === "activity") return yield* Effect.flatMap(Effect.service(Navigation), (navigation) => navigation.open("assistant", ""));
    if (yield* Effect.flatMap(Effect.service(AssistantDraft), (draft) => draft.back())) return true;
    return yield* Effect.flatMap(Effect.service(Assistant), (assistant) => assistant.back());
  }), false);
