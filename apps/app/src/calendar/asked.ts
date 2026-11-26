// spec/app/calendar/agent.md, "The card shows in Ask Alpha too, under the reply that filed its request, typed or spoken"
import type { InAskAlpha } from "../../gen/app__calendar__agent.ts";
import { externalStore } from "../runtime/store.ts";

/** A Calendar request a reply of Ask Alpha filed: the conversation, by its number, the reply, as the agent names it, and the request. */
export interface Filed {
  readonly conversation: number;
  readonly message: string;
  readonly request: string;
}

/** The requests replies filed, and what the agent's calendar has to show of them in Ask Alpha. */
export interface Asked {
  readonly filed: ReadonlyArray<Filed>;
  readonly shown: InAskAlpha;
}

/** One action a reply ran, as the agent reports it. */
export interface Ran {
  readonly action: string;
  readonly data?: unknown;
}

/** The ids of the requests the Calendar action filed in `ran`, read from its own result. @throws {never} */
export function filedRequests(ran: ReadonlyArray<Ran>): string[] {
  return ran.flatMap(({ action, data }) => {
    const id = action === "CALENDAR" && typeof data === "object" && data !== null ? (data as { approvalRequestId?: unknown }).approvalRequestId : undefined;
    return typeof id === "string" && id !== "" ? [id] : [];
  });
}

const store = externalStore<Asked>({ filed: [], shown: "NothingToShow" });

/** What Ask Alpha shows of the agent's Calendar requests, as a store its screen reads, and Calendar tells. */
export const asked = {
  snapshot: store.snapshot,
  subscribe: store.subscribe,
  /** Keep the requests the Calendar action filed in the reply `message` of `conversation`; whether it filed one. @throws {never} */
  file(conversation: number, message: string, ran: ReadonlyArray<Ran>): boolean {
    const now = store.snapshot();
    const ids = filedRequests(ran);
    const added = ids.filter((request) => !now.filed.some((one) => one.request === request)).map((request) => ({ conversation, message, request }));
    if (added.length > 0) store.set({ ...now, filed: [...now.filed, ...added] });
    return ids.length > 0;
  },
  /** Calendar says what it has to show. @throws {never} */
  show(shown: InAskAlpha): void {
    if (store.snapshot().shown !== shown) store.set({ ...store.snapshot(), shown });
  },
};
