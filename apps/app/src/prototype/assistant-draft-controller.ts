/**
 * Alpha's composer, Calendar and email recovery drafts use the durable draft controller
 * (ui/state/durable-draft-controller.ts): durable hold/commit/release around
 * each send, conversation and owner fencing by binding, and an unknown dispatch outcome that is
 * never offered for a second send. This name is kept for the existing call sites.
 */
export {DurableDraftController as AssistantDraftController} from '../ui/state/durable-draft-controller.ts';
