// spec/app/ask/index.md, "Story: Talk to my agent"
import type { TurnReply } from "@elizaos/agent";
import type { Route } from "./routes.ts";

export interface AskScene {
  opened: number;
  readonly said: string[];
  down: boolean;
  stalled: boolean;
  readonly turns: Map<string, () => void>;
  readonly kept: Map<string, Kept>;
  searchDown: boolean;
  /** The agent fails every read of a conversation's messages with a 503, as while it is starting. */
  pagesDown: boolean;
  /** The agent lists its conversations but answers every read of their messages 404, as a mismatched store or a proxy does. */
  pagesMissing: boolean;
  /** How many reads of a conversation's messages, and of the list of conversations, the agent was asked. */
  pageReads: number;
  listReads: number;
  /** While set, the agent holds each answer to a read of the list until the test lets it go. */
  holdLists: boolean;
  readonly heldLists: (() => void)[];
  acknowledgment?: string;
  metadata?: unknown[];
  /** The failure fields of the resident's terminal reply. */
  refusal?: Pick<TurnReply, "cloudCode" | "planAction"> & { readonly failureKind: NonNullable<TurnReply["failureKind"]> };
  nextReplyChunks?: readonly string[];
  nextReplyProvisional?: boolean;
  /** The actions the next reply says it ran, made from the turn's metadata, as eliza's agent lists them on its done frame. */
  nextActions?: (metadata: unknown) => readonly unknown[];
  cloudWarmCalls: number;
}

export interface Kept {
  readonly roomId: string;
  readonly title: string;
  readonly messages: { id: string; role: "user" | "assistant"; text: string }[];
}

export function askScene(): AskScene {
  return { opened: 0, said: [], down: false, stalled: false, turns: new Map(), kept: new Map(), searchDown: false, pagesDown: false, pagesMissing: false, pageReads: 0, listReads: 0, holdLists: false, heldLists: [], cloudWarmCalls: 0 };
}

const encoder = new TextEncoder();
const frame = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
/** What ends a turn, as eliza's agent names its messages (`.eliza/packages/agent/src/client/reply-frame.schema.vibe`, `DoneFrame`). */
const named = (turn: number) => ({ messageId: `m${turn}a`, userMessageId: `m${turn}u`, agentName: "Alpha", actionResults: [] });

function reply(scene: AskScene, room: string, text: string, keep: (said: string) => void, metadata: unknown): Response {
  const custom = scene.nextReplyChunks;
  const provisional = scene.nextReplyProvisional;
  const actions = scene.nextActions?.(metadata) ?? [];
  scene.nextReplyChunks = undefined;
  scene.nextReplyProvisional = undefined;
  scene.nextActions = undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(frame({ type: "status", activity: "thinking" }));
      if (scene.refusal !== undefined) {
        controller.enqueue(frame({ type: "done", fullText: "", ...named(scene.said.length), ...scene.refusal }));
        controller.close();
        return;
      }
      if (scene.acknowledgment !== undefined) controller.enqueue(frame({ type: "acknowledgment", text: scene.acknowledgment }));
      if (scene.acknowledgment !== undefined) controller.enqueue(frame({ type: "tool", name: "CALENDAR", label: "Using Calendar" }));
      if (scene.stalled) {
        controller.enqueue(frame({ type: "token", text: "Thinking" }));
        scene.turns.set(room, () => controller.close());
        return;
      }
      if (custom !== undefined && custom.length > 0) {
        for (const piece of custom) controller.enqueue(frame({ type: "token", text: piece, ...(provisional ? { provisional } : {}) }));
        const full = custom.join("");
        keep(full);
        controller.enqueue(frame({ type: "done", fullText: full, ...named(scene.said.length), actionResults: actions }));
        controller.close();
        return;
      }
      controller.enqueue(frame({ type: "token", text: "You said: " }));
      controller.enqueue(frame({ type: "token", text }));
      keep(`You said: ${text}`);
      controller.enqueue(frame({ type: "done", fullText: `You said: ${text}`, ...named(scene.said.length) }));
      controller.close();
    },
    cancel: () => void scene.turns.delete(room),
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

export function askRoutes(scene: AskScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/conversations") return;
      if (scene.down) return Response.json({ error: "starting" }, { status: 503 });
      const id = ++scene.opened;
      scene.kept.set(`c${id}`, { roomId: `r${id}`, title: "Ask Alpha", messages: [] });
      return Response.json({ conversation: { id: `c${id}`, roomId: `r${id}`, title: "Ask Alpha", createdAt: 0, updatedAt: 0 } }, { status: 201 });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/conversations") return;
      scene.listReads += 1;
      const listing = Response.json({ conversations: [...scene.kept].map(([id, one]) => ({ id, roomId: one.roomId, title: one.title, createdAt: 0, updatedAt: 0 })) });
      return scene.holdLists ? new Promise<Response>((resolve) => void scene.heldLists.push(() => resolve(listing))) : listing;
    },
    (request, url) => {
      const id = /^\/api\/conversations\/([^/]+)\/messages$/.exec(url.pathname)?.[1];
      if (request.method !== "GET" || id === undefined || id === "messages") return;
      scene.pageReads += 1;
      if (scene.pagesDown) return Response.json({ error: "starting" }, { status: 503 });
      if (scene.pagesMissing) return Response.json({ error: "unknown_conversation" }, { status: 404 });
      const one = scene.kept.get(id);
      return one === undefined ? Response.json({ error: "unknown_conversation" }, { status: 404 }) : Response.json({ messages: one.messages.map((message) => ({ ...message, timestamp: 0 })) });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/conversations/messages/search") return;
      if (scene.searchDown) return Response.json({ error: "down" }, { status: 500 });
      const words = (url.searchParams.get("q") ?? "").toLowerCase();
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const hits = [...scene.kept].flatMap(([id, one]) => one.messages.filter((message) => message.text.toLowerCase().includes(words))
        .map((message) => ({ messageId: message.id, conversationId: id, roomId: one.roomId, role: message.role, text: message.text, createdAt: 0 })));
      const results = hits.slice(offset, offset + limit);
      return Response.json({ results, count: results.length });
    },
    (request, url) => {
      const id = /^\/api\/conversations\/([^/]+)\/fork$/.exec(url.pathname)?.[1];
      if (request.method !== "POST" || id === undefined) return;
      return request.json().then(({ messageId }: { messageId: string }) => {
        const source = scene.kept.get(id);
        const at = source?.messages.findIndex((message) => message.id === messageId) ?? -1;
        if (source === undefined || at < 0) return Response.json({ error: "unknown_message" }, { status: 404 });
        const fork = ++scene.opened;
        scene.kept.set(`c${fork}`, { roomId: `r${fork}`, title: `${source.title} (fork)`, messages: source.messages.slice(0, at + 1).map((message) => ({ ...message, id: `${message.id}f${fork}` })) });
        return Response.json({ conversation: { id: `c${fork}`, roomId: `r${fork}`, title: `${source.title} (fork)`, createdAt: 0, updatedAt: 0 } }, { status: 201 });
      });
    },
    (request, url) => {
      const found = /^\/api\/conversations\/c(\d+)\/messages(\/stream)?$/.exec(url.pathname);
      if (request.method !== "POST" || !found) return;
      const messages = scene.kept.get(`c${found[1]}`)?.messages ?? [];
      const keep = (role: "user" | "assistant", text: string) => void messages.push({ id: `m${scene.said.length}${role === "user" ? "u" : "a"}`, role, text });
      return request.json().then((body: { text: string; metadata?: unknown }) => {
        scene.metadata?.push(body.metadata);
        if (body.text !== body.text.trim()) return Response.json({ error: "invalid_message" }, { status: 400 });
        if (found[2] === undefined) return Response.json({ text: `You said: ${body.text}`, ...named(scene.said.length) });
        scene.said.push(body.text);
        keep("user", body.text);
        Object.assign(messages.at(-1) ?? {}, { clientMessageId: (body as { clientMessageId?: string }).clientMessageId });
        return reply(scene, `r${found[1]}`, body.text, (said) => keep("assistant", said), body.metadata);
      });
    },
    (request, url) => {
      const room = /^\/api\/turns\/([^/]+)\/abort$/.exec(url.pathname)?.[1];
      if (request.method !== "POST" || room === undefined) return;
      return request.json().then(({ reason }: { reason: string }) => {
        const stop = scene.turns.get(room);
        scene.turns.delete(room);
        stop?.();
        return Response.json({ aborted: stop !== undefined, roomId: room, reason, outcome: stop === undefined ? "nothingRunning" : "stopped" });
      });
    },
    (request, url) => (request.method === "GET" && url.pathname === "/api/status" ? Response.json({ serverInstanceId: "alpha-fake" }) : undefined),
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/cloud/warm") return;
      scene.cloudWarmCalls += 1;
      return Response.json({ warmed: true });
    },
  ];
}
