// spec/app/calendar/agent.md, "The card shows in Ask Alpha too, under the reply that filed its request, typed or spoken"
import { createContext } from "react";
import type { InAskAlpha } from "../../gen/app__calendar__agent.ts";
import { externalStore } from "../runtime/store.ts";

/** A Calendar request a reply of Ask Alpha filed: the conversation, by its number, the reply, as the agent names it, and the request. */
export interface Filed {
  readonly conversation: number;
  readonly message: string;
  readonly request: string;
}

/** The requests replies filed, what the agent's calendar has to show of them in Ask Alpha, and the request it holds; "" for none. */
export interface Asked {
  readonly filed: ReadonlyArray<Filed>;
  readonly shown: InAskAlpha;
  readonly holds: string;
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

/** The request the Calendar card of `conversation` is bound to: the one the calendar holds, while a reply there filed it. @throws {never} */
export function boundIn(now: Asked, conversation: number): string | undefined {
  return now.holds !== "" && now.filed.some((one) => one.conversation === conversation && one.request === now.holds) ? now.holds : undefined;
}

/** The request the Calendar card in Ask Alpha is bound to: it shows, and decides, that request only. */
export const AskedRequest = createContext<string | undefined>(undefined);

const store = externalStore<Asked>({ filed: [], shown: "NothingToShow", holds: "" });

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
  /** Calendar says what it has to show, and the request it holds. @throws {never} */
  show(shown: InAskAlpha, holds: string): void {
    const now = store.snapshot();
    if (now.shown !== shown || now.holds !== holds) store.set({ ...now, shown, holds });
  },
};
