// spec/notes/collection.md, "Story: Read my notes under the account I am signed in as"
import type { NotesTransport } from "@elizaos/plugin-notes-client";

/** A resident answer that refused the request, with its HTTP status. */
export class ResidentAnswerRefused extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
    this.name = "ResidentAnswerRefused";
  }
}

/** One JSON request to the resident, as the Notes layer supplies it from the platform's Resident service. */
export type ResidentJson = (method: "GET" | "POST", path: string, body: unknown, signal?: AbortSignal) => Promise<{ readonly status: number; readonly data: unknown }>;

/** The upstream Notes client's transport over the resident's local API. */
export function residentTransport(json: ResidentJson): NotesTransport {
  return {
    async fetch<T = unknown>(path: string, init: { method: "GET" | "POST"; body?: string; signal?: AbortSignal }): Promise<T> {
      const body: unknown = init.body === undefined ? undefined : JSON.parse(init.body);
      const answer = await json(init.method, path, body, init.signal);
      if (answer.status >= 400) {
        const data = answer.data as { error?: unknown; code?: unknown } | null;
        throw new ResidentAnswerRefused(answer.status, typeof data?.error === "string" ? data.error : `Notes answered ${answer.status}.`, typeof data?.code === "string" ? data.code : undefined);
      }
      return answer.data as T;
    },
  };
}
