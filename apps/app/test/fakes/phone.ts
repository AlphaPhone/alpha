import type { AgentEvents, AgentRequest, AgentStatus, AgentStreamRequest, ElizaAgentPlugin } from "@elizaos/os/bridges/definitions/agent";
import type { ElizaCloudPlugin, NativeCloudRequest } from "@elizaos/os/bridges/definitions/cloud";
import type { ElizaSecureStorePlugin, ElizaSecureStoreResult } from "@elizaos/os/bridges/definitions/secure-store";
import type { Answering } from "./routes.ts";

/**
 * A plugin as its Java or Kotlin answers the page: each method of eliza's definition `P`. The phone is faked once, at
 * the boundary Capacitor's own runtime calls on a native platform (`plugIn`), with eliza's plugins behind it by their
 * names, arguments, answers, rejections and events (`.eliza/packages/os/android`, typed by
 * `.eliza/packages/os/src/bridges/definitions`): Alpha's phone layers, eliza's clients and Capacitor run on it unchanged.
 */
export type Native<P> = { [Method in Exclude<keyof P, "addListener">]: P[Method] };

/** Send the page's listeners an event of a plugin, as `notifyListeners` does. */
export type Emit<Events> = <Name extends keyof Events & string>(event: Name, data: Events[Name]) => void;

/** One plugin of the fake phone: its methods, given the way to emit its events. */
export type Faked = (emit: (event: string, data: unknown) => void) => object;

/** The fake of a plugin whose definition is `P` and whose events are `Events`: it does not compile once eliza changes either. */
export const plugin = <P, Events = Record<never, never>>(make: (emit: Emit<Events>) => Native<P>): Faked => (emit) => make(emit);

/** What a plugin rejects a call with: Android's `call.reject(message, code)`. */
export function rejection(message: string, code = message) {
  return Object.assign(new Error(message), { code });
}

const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (one) => String.fromCharCode(one)).join(""));

/**
 * `AgentPlugin.java`, the `ElizaAgent` plugin: `request` answers `{ status, data }`, where data is the JSON of the
 * agent's body, null for none, or its text; `requestStream` answers `{ id }`, then emits a head and each chunk as
 * `streamData` and one `streamEnd`; `abort` ends either. It relays a path under `/api/`, a JSON object and the headers
 * its channel admits; `subscribeEvents` answers `{ id }`, then emits each event the agent publishes on the topic as
 * `agentEvent`, until `unsubscribeEvents`.
 */
export function elizaAgent(agent: Answering): Faked {
  return plugin<ElizaAgentPlugin, AgentEvents>((emit) => {
    const calls = new Map<string, AbortController>();
    const status = (): Promise<AgentStatus> => Promise.resolve({ available: true, state: "running", epoch: 1, requestBodyLimit: 1_048_576 });
    function asked({ method, path, body, headers }: AgentRequest, id: string) {
      if (typeof method !== "string" || typeof path !== "string" || !path.startsWith("/api/")) throw rejection("RouteRefused");
      if (id === "" || calls.has(id)) throw rejection("IdInUse");
      const gone = new AbortController();
      calls.set(id, gone);
      return new Request(new URL(path, "http://agent.phone"), { method, signal: gone.signal, headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    async function listen(id: string, request: Request) {
      let index = 0;
      const response = await agent(request).catch(() => undefined);
      const reader = response?.body?.pipeThrough(new TextDecoderStream()).getReader();
      request.signal.addEventListener("abort", () => void reader?.cancel(), { once: true });
      let held = "";
      for (let read = await reader?.read().catch(() => undefined); read && !read.done; read = await reader?.read().catch(() => undefined)) {
        const parts = (held + read.value).split("\n\n");
        held = parts.pop() ?? "";
        for (const part of parts) if (part.startsWith("data: ")) emit("agentEvent", { id, kind: "event", index: index++, event: JSON.parse(part.slice(6)) as Record<string, unknown> });
      }
      if (calls.delete(id)) emit("agentEvent", { id, kind: "end" });
    }
    async function pump(id: string, request: Request) {
      let index = 0;
      try {
        const response = await agent(request);
        emit("streamData", { id, kind: "head", index: index++, status: response.status, headers: Object.fromEntries(response.headers) });
        const reader = response.body?.getReader();
        request.signal.addEventListener("abort", () => void reader?.cancel(), { once: true });
        if (request.signal.aborted) void reader?.cancel();
        for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) emit("streamData", { id, kind: "chunk", index: index++, dataBase64: base64(read.value) });
        emit("streamEnd", { id, kind: calls.has(id) ? "end" : "aborted" });
      } catch {
        emit("streamEnd", { id, kind: calls.has(id) ? "error" : "aborted" });
      } finally {
        calls.delete(id);
      }
    }
    const aborted = ({ id }: { id: string }) => {
      const call = calls.get(id);
      calls.delete(id);
      call?.abort();
      return Promise.resolve({ aborted: call !== undefined });
    };
    return {
      getStatus: status,
      start: status,
      stop: status,
      restart: status,
      async request(options: AgentRequest) {
        const id = options.id ?? crypto.randomUUID();
        try {
          const response = await agent(asked(options, id));
          const text = await response.text();
          let data: unknown = null;
          if (text !== "") try { data = JSON.parse(text) as unknown; } catch { data = text; }
          return { status: response.status, data };
        } catch (cause) {
          throw cause instanceof Error && "code" in cause ? cause : rejection("Broken");
        } finally {
          calls.delete(id);
        }
      },
      requestStream(options: AgentStreamRequest) {
        try {
          void pump(options.id, asked(options, options.id));
          return Promise.resolve({ id: options.id });
        } catch (cause) {
          return Promise.reject(cause instanceof Error ? cause : rejection("Broken"));
        }
      },
      abort: aborted,
      subscribeEvents({ id, topic, clientId }) {
        try {
          void listen(id, asked({ method: "GET", path: `/api/events?topic=${topic}${clientId === undefined ? "" : `&clientId=${clientId}`}` }, id));
          return Promise.resolve({ id });
        } catch (cause) {
          return Promise.reject(cause instanceof Error ? cause : rejection("Broken"));
        }
      },
      unsubscribeEvents: aborted,
      reviewRecovery: () => Promise.resolve({ kind: "unavailable" }),
      archiveRecovery: () => Promise.resolve({ kind: "unavailable" }),
    };
  });
}

/**
 * `ElizaCloudPlugin.java`, the `ElizaCloud` plugin: `request` sends one listed route under the device key it alone
 * holds and answers the status, the headers a page may read and the body in base64; what it will not send it rejects
 * with one of eliza's `CloudFailure` codes.
 */
export function elizaCloud(cloud: Answering, signedIn: () => boolean): Faked {
  return plugin<ElizaCloudPlugin>(() => ({
    async request({ method, target, headers, body }: NativeCloudRequest) {
      if (!target.startsWith("/api/")) throw rejection("not-listed");
      if (!signedIn()) throw rejection("sign-in-required");
      const response = await cloud(new Request(new URL(target, "http://cloud.phone"), { method, headers: { ...headers, authorization: "Bearer device-key", ...(body === undefined ? {} : { "content-type": "application/json" }) }, body })).catch(() => { throw rejection("network"); });
      const found = { etag: response.headers.get("etag"), contentType: response.headers.get("content-type"), retryAfter: response.headers.get("retry-after") };
      return { status: response.status, body: base64(new Uint8Array(await response.arrayBuffer())), ...Object.fromEntries(Object.entries(found).filter(([, value]) => value !== null)) };
    },
    readGrant: () => Promise.reject(rejection("grant-unknown")),
    cancel: () => Promise.resolve({ cancelled: false }),
    openExternal: () => Promise.resolve({ opened: true }),
  }));
}

/**
 * `SecureStorePlugin.kt`, the `ElizaSecureStore` plugin: every call resolves, and says in `ok`, `error` and `outcome`
 * how it went. The host's policy opens `open` to the page and denies every other slot.
 */
export function elizaSecureStore(secrets: Map<string, string>, open: ReadonlySet<string>): Faked {
  const denied: ElizaSecureStoreResult = { ok: false, error: "denied", outcome: "Refused" };
  return plugin<ElizaSecureStorePlugin>(() => ({
    get: ({ key }) => Promise.resolve(!open.has(key) ? { ok: false, error: "denied" } : secrets.has(key) ? { ok: true, value: secrets.get(key)! } : { ok: false, error: "not_found" }),
    set({ key, value }) {
      if (!open.has(key)) return Promise.resolve(denied);
      secrets.set(key, value);
      return Promise.resolve({ ok: true, outcome: "Written" });
    },
    remove({ key }) {
      if (!open.has(key)) return Promise.resolve(denied);
      secrets.delete(key);
      return Promise.resolve({ ok: true, outcome: "Removed" });
    },
    compareAndExchange({ key, expected, value }) {
      if (!open.has(key)) return Promise.resolve(denied);
      if ((secrets.get(key) ?? null) !== expected) return Promise.resolve({ ok: false, error: "conflict", outcome: "Conflict" });
      if (value === null) secrets.delete(key);
      else secrets.set(key, value);
      return Promise.resolve({ ok: true, outcome: value === null ? "Removed" : "Written" });
    },
    status: () => Promise.resolve({ ok: true, available: true, backend: "android_keystore", accessibility: "credential_encrypted_device_only", synchronized: false, accessGroup: "app_only" }),
  }));
}

type Hear = (data: unknown) => void;
interface Capacitor {
  PluginHeaders?: { name: string; methods: { name: string; rtype?: string }[] }[];
  nativePromise?: (plugin: string, method: string, options: unknown) => Promise<unknown>;
  nativeCallback?: (plugin: string, method: string, options: { eventName?: string; callbackId?: string }, heard?: Hear) => string;
}

/**
 * Make the page a phone's: Android's bridge object, which is how Capacitor tells the platform, and on `Capacitor` the
 * header of each plugin of `plugins` and the two calls its runtime makes of the native side. The returned function
 * takes them off again.
 * @throws {never}
 */
export function plugIn(plugins: Readonly<Record<string, Faked>>): () => void {
  const page = globalThis as { Capacitor?: Capacitor; androidBridge?: object };
  const capacitor = (page.Capacitor ??= {});
  const hearing = new Map<string, Map<string, Hear>>();
  const heard = (name: string, event: string) => hearing.get(`${name} ${event}`) ?? hearing.set(`${name} ${event}`, new Map()).get(`${name} ${event}`)!;
  const made = Object.fromEntries(Object.entries(plugins).map(([name, make]) => [name, make((event, data) => { for (const hear of [...heard(name, event).values()]) hear(data); }) as Record<string, (options: unknown) => unknown>]));
  let listeners = 0;
  page.androidBridge = {};
  capacitor.PluginHeaders = Object.entries(made).map(([name, methods]) => ({ name, methods: [...Object.keys(methods).map((method) => ({ name: method, rtype: "promise" })), { name: "addListener" }, { name: "removeListener" }] }));
  capacitor.nativePromise = (name, method, options) => Promise.resolve().then(() => {
    const call = made[name]?.[method];
    if (call === undefined) throw rejection(`${name}.${method} is not implemented`, "UNIMPLEMENTED");
    return call(options ?? {});
  });
  capacitor.nativeCallback = (name, method, options, hear) => {
    const id = options.callbackId ?? String(++listeners);
    if (method === "addListener" && hear) heard(name, options.eventName ?? "").set(id, hear);
    if (method === "removeListener") heard(name, options.eventName ?? "").delete(id);
    return id;
  };
  return () => {
    hearing.clear();
    delete page.androidBridge;
    delete capacitor.PluginHeaders;
    delete capacitor.nativePromise;
    capacitor.nativeCallback = () => "";
  };
}

/** Press a hardware button, as Alpha's Android host does: Back reaches the page only while the page says it can go back, and is Home otherwise. */
export function pressButton(button: "back" | "home") {
  const back = button === "back" && document.documentElement.dataset.alphaCanGoBack === "true";
  window.dispatchEvent(new Event(back ? "alpha-back" : "launcher-home"));
}
