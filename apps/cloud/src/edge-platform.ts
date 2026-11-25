// spec/cloud/rollout.md, "The API Worker is told the web host it was asked for, and gets none of the caller's forwarding or hop-by-hop headers"
import { headerKept } from "../gen/cloud__rollout.ts";

export const EdgeHeaders = globalThis.Headers;
export const EdgeResponse = globalThis.Response;
export const EdgeRequest = globalThis.Request;

/**
 * The headers sent on to the API Worker: the caller's own, without hop-by-hop or earlier forwarding headers, naming
 * the web host it was asked for.
 * @throws {never}
 */
export function forwardedHeaders(incoming: Headers, webHost: string): Headers {
  const headers = new EdgeHeaders();
  incoming.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (headerKept(lower, lower.startsWith("x-forwarded-"))) headers.set(lower, value);
  });
  headers.set("x-forwarded-host", webHost);
  headers.set("x-forwarded-proto", "https");
  return headers;
}
