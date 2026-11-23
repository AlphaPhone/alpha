// spec/platform/index.md, "The phone's key stays with native, and a leaving screen cancels only its own call"; spec/platform/index.md, "Only a route the Cloud client lists is requested"
import type { CloudClient as NativeCloud, CloudMethod, CloudPath, EnvironmentName } from "@elizaos/os/bridges/definitions/cloud";

const methods = new Set<string>(["GET", "POST", "PATCH", "DELETE"]);

/** The text of a reply body. @throws {never} */
export function textOf(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** The whole seconds a `Retry-After` value asks to wait at `now`, from delta seconds or an HTTP date; undefined when it gives none. @throws {never} */
export function retryAfterSecondsOf(value: string | undefined, now: number): number | undefined {
  if (value === undefined) return undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  }
  const at = Date.parse(text);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - now) / 1000));
}

const isoInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function fieldsOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** The epoch milliseconds a refusal body names as `resetAt`, under its `error` or at its top, as an ISO instant or a whole number; undefined when it names none. @throws {never} */
export function resetAtOf(body: unknown): number | undefined {
  const top = fieldsOf(body);
  const named = fieldsOf(top?.error)?.resetAt ?? top?.resetAt;
  if (typeof named === "number") return Number.isSafeInteger(named) && named > 0 ? named : undefined;
  if (typeof named !== "string" || named.length > 64 || !isoInstant.test(named.trim())) return undefined;
  const at = Date.parse(named.trim());
  return Number.isFinite(at) ? at : undefined;
}

/**
 * A `fetch` for `@elizaos/cloud/client` over the native Cloud plugin: only requests to `base` go out, as
 * the plugin's own calls in `environment`, so the key it holds is attached by native and never by the page.
 * @throws {never}
 */
export function nativeCloudFetch(cloud: NativeCloud, origin: string, environment?: EnvironmentName): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== origin || !methods.has(request.method)) throw new TypeError("Only the configured Cloud is reachable.");
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => {
      if (name !== "authorization" && name !== "content-type" && name !== "content-length") headers[name] = value;
    });
    const text = request.method === "GET" || request.method === "DELETE" ? "" : await request.text();
    const body: unknown = text === "" ? undefined : JSON.parse(text);
    const reply = await cloud.request({
      method: request.method as CloudMethod,
      path: url.pathname as CloudPath,
      ...(url.search === "" ? {} : { query: Object.fromEntries(url.searchParams) }),
      ...(Object.keys(headers).length === 0 ? {} : { headers }),
      ...(body === undefined ? {} : { body }),
      ...(environment === undefined ? {} : { environment }),
      signal: request.signal,
    });
    const answer = new Headers();
    if (reply.contentType !== undefined) answer.set("content-type", reply.contentType);
    if (reply.retryAfter !== undefined) answer.set("retry-after", reply.retryAfter);
    if (reply.etag !== undefined) answer.set("etag", reply.etag);
    return new Response(reply.status === 204 ? null : new Uint8Array(reply.body), { status: reply.status, headers: answer });
  };
}

/** What a test Cloud answers one request with. */
export interface RouteAnswer {
  readonly status: number;
  readonly data: unknown;
}

/** A `fetch` that answers from `answer`, for the typed client of a fake Cloud. @throws {never} */
export function routeFetch(answer: (method: string, path: string, body: unknown) => RouteAnswer): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const text = request.method === "GET" || request.method === "DELETE" ? "" : await request.text();
    const said = answer(request.method, url.pathname + url.search, text === "" ? undefined : JSON.parse(text));
    return new Response(JSON.stringify(said.data), { status: said.status, headers: { "content-type": "application/json" } });
  };
}

/** The answer a fake Cloud gives from `routes` keyed `"METHOD /path"`: data or a function of the body; signed out, a 401. @throws {never} */
export function answerRoute(
  routes: { readonly [route: string]: unknown },
  statuses: { readonly [route: string]: number } | undefined,
  signedIn: boolean,
  method: string,
  path: string,
  body: unknown,
): RouteAnswer {
  const key = `${method} ${path.split("?")[0]}`;
  if (!signedIn) return { status: 401, data: { error: "authentication_required" } };
  if (!Object.hasOwn(routes, key)) return { status: 404, data: { error: "not_found" } };
  const route = routes[key];
  try {
    return { status: statuses?.[key] ?? 200, data: typeof route === "function" ? (route as (body: unknown) => unknown)(body) : route };
  } catch {
    return { status: 500, data: { error: "service_unavailable" } };
  }
}
