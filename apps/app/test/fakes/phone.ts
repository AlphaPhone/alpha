// The page's `Capacitor` as Android injects it, faked once at that boundary: the plugins of eliza's Android package
// by their names, arguments, answers and events (packages/os/android at the commit of eliza.lock.json), over the
// routes the journeys use. The phone's own platform layers run against it unchanged.
import type { Answering } from "./routes.ts";
import type { Scene } from "./scene.ts";

type Hear = (data: unknown) => void;

function rejection(message: string, code?: string) {
  return Object.assign(new Error(message), { code });
}

/** A plugin's events, as Android's own objects give them: `addListener` answers with a handle at once, and not with a promise. */
function emitter() {
  const hearing = new Map<string, Set<Hear>>();
  return {
    emit: (event: string, data: unknown) => { for (const hear of [...(hearing.get(event) ?? [])]) hear(data); },
    addListener: (event: string, hear: Hear) => {
      const heard = hearing.get(event) ?? new Set<Hear>();
      hearing.set(event, heard.add(hear));
      return { remove: () => Promise.resolve(void heard.delete(hear)) };
    },
  };
}

interface Asked { method?: string; path?: string; body?: unknown; id?: string }

/** `EmbeddedAgentPlugin`: `request` answers `{ status, data }`; `requestStream` answers `{ id }`, then emits each event's data as `streamData` and one `streamEnd`. It relays no header. */
function embeddedAgent(agent: Answering) {
  const { emit, addListener } = emitter();
  const streams = new Map<string, AbortController>();
  const status = () => Promise.resolve({ available: true, onDevice: true, state: "running", requestBodyLimit: 1_048_576 });
  function asked({ method, path, body }: Asked, signal?: AbortSignal) {
    if (typeof method !== "string" || typeof path !== "string" || !path.startsWith("/api/")) throw rejection("This agent route is not available", "ROUTE_REFUSED");
    if (body !== undefined && (typeof body !== "object" || body === null || Array.isArray(body))) throw rejection("The agent request failed", "INVALID_REQUEST");
    return new Request(new URL(path, "http://agent.phone"), { method, signal, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }) });
  }
  async function pump(id: string, request: Request) {
    try {
      const response = await agent(request);
      const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
      // The plugin closes the agent's socket when the page aborts the stream.
      request.signal.addEventListener("abort", () => void reader?.cancel(), { once: true });
      if (request.signal.aborted) void reader?.cancel();
      let pending = "";
      for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
        const events = (pending + read.value).split("\n\n");
        pending = events.pop() ?? "";
        for (const event of events) emit("streamData", { id, data: event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(line.startsWith("data: ") ? 6 : 5)).join("\n") });
      }
      emit("streamEnd", streams.has(id) ? { id, status: response.status } : { id, aborted: true });
    } catch {
      emit("streamEnd", streams.has(id) ? { id, error: "Agent stream failed" } : { id, aborted: true });
    } finally {
      streams.delete(id);
    }
  }
  return {
    addListener,
    getStatus: status,
    start: status,
    restart: status,
    async request(options: Asked) {
      const response = await agent(asked(options));
      const text = await response.text();
      return { status: response.status, data: text === "" ? null : JSON.parse(text) as unknown };
    },
    requestStream(options: Asked) {
      const id = options.id ?? "";
      if (!/^[A-Za-z0-9-]{8,64}$/.test(id) || streams.has(id)) return Promise.reject(rejection("A new stream id is required", "INVALID_STREAM_ID"));
      const gone = new AbortController();
      const request = asked(options, gone.signal);
      streams.set(id, gone);
      void pump(id, request);
      return Promise.resolve({ id });
    },
    abort({ id = "" }: Asked) {
      const stream = streams.get(id);
      streams.delete(id);
      stream?.abort();
      return Promise.resolve({ aborted: stream !== undefined });
    },
  };
}

/** `SecureStorePlugin`: every call resolves, and says in `ok` and `error` how it went. */
function secureStore(secrets: Map<string, string>) {
  return {
    get: ({ key = "" }: { key?: string }) => Promise.resolve(secrets.has(key) ? { ok: true, value: secrets.get(key) } : { ok: false, error: "not_found", message: "Secure value was not found." }),
    set({ key = "", value = "" }: { key?: string; value?: string }) {
      if (value === "") return Promise.resolve({ ok: false, error: "invalid_input", message: "Secure value must be non-empty." });
      secrets.set(key, value);
      return Promise.resolve({ ok: true });
    },
    remove: ({ key = "" }: { key?: string }) => Promise.resolve({ ok: true, deleted: secrets.delete(key) }),
  };
}

/** Put the phone's `Capacitor` on the page: the agent's and the secure store's plugins, and, on an Alpha image, the headers of the plugins only its host registers. The returned function takes it off again. @throws {never} */
export function plugIn(world: Scene, agent: Answering): () => void {
  const page = globalThis as { Capacitor?: unknown };
  const image = world.image ? ["AlphaTelephony", "ElizaContacts"] : [];
  page.Capacitor = {
    Plugins: { EmbeddedAgent: embeddedAgent(agent), ElizaSecureStore: secureStore(world.secrets) },
    PluginHeaders: ["EmbeddedAgent", "ElizaSecureStore", ...image].map((name) => ({ name })),
  };
  return () => { delete page.Capacitor; };
}

/** Press a hardware button, as Alpha's Android host does: Back reaches the page only while the page says it can go back, and is Home otherwise. */
export function pressButton(button: "back" | "home") {
  const back = button === "back" && document.documentElement.dataset.alphaCanGoBack === "true";
  window.dispatchEvent(new Event(back ? "alpha-back" : "launcher-home"));
}
