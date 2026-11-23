// spec/assistant/index.md, "Story: Ask my assistant from anywhere"
import { Effect } from "effect";
import { runtime } from "./runtime.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { ChatAttachments } from "../../assistant/attachments.vibe";
import { Composer } from "../../assistant/composer.vibe";
import { AssistantDraft } from "../../assistant/draft.vibe";
import { DeviceReview } from "../../assistant/review.vibe";
import { ChatSearch } from "../../assistant/search.vibe";
import { AssistantHost } from "../../assistant/host.vibe";
import { AssistantEmail } from "../../assistant/ports.vibe";

/** Run one effect of the assistant's services in the app runtime, without waiting for it. */
export const run = (work: Effect.Effect<unknown, unknown, Assistant | Composer | ChatAttachments | DeviceReview | ChatSearch | AssistantHost | AssistantDraft>) =>
  runtime.runFork(Effect.catchCause(work, () => Effect.void));

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
export const inferenceOf = () => runtime.runSync(Effect.flatMap(Effect.service(AssistantHost), (host) => host.inference()));
/** The selected Inbox account's address, for an email card's "me". */
export const ownAddressNow = () => runtime.runSync(Effect.flatMap(Effect.service(AssistantEmail), (mail) => mail.address()));
/** Whether an emergency call is live now. */
export const emergencyNow = () => runtime.runSync(Effect.flatMap(Effect.service(AssistantHost), (host) => host.emergency()));
