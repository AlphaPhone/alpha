// spec/cloud/rollout.md, "Story: Tell whether a deployed environment is ready"
import edgeWorker from "../src/edge.vibe";

/**
 * A fetch that reaches an environment of Alpha's own cloud whose API Worker is the cloud command listening at `local`:
 * its API origin straight to that listener, its App Link host through the web host Worker bound to it.
 * @throws {never}
 */
export function hosting(local: string, origins: { readonly api: string; readonly web: string }): typeof globalThis.fetch {
  const api = (request: Request) => {
    const url = new URL(request.url);
    return globalThis.fetch(`${local}${url.pathname}${url.search}`, { method: request.method, headers: request.headers, redirect: "manual" });
  };
  const env = { CLOUD_ENVIRONMENT: "staging" as const, PUBLIC_API_ORIGIN: origins.api, WEB_ORIGIN: origins.web, API: { fetch: api } };
  return (input, init) => {
    const request = new Request(input, init);
    const { origin } = new URL(request.url);
    if (origin === origins.web) return edgeWorker.fetch(request, env);
    if (origin === origins.api) return api(request);
    return Promise.reject(new TypeError(`no such host in this run: ${origin}`));
  };
}
