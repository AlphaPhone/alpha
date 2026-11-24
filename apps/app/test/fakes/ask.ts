// spec/app/ask/index.md, "Story: Talk to my agent"
import type { Route } from "./routes.ts";

/** What the fake agent holds for Ask Alpha, and how it behaves; a journey changes it between steps. */
export interface AskScene {
  /** How many conversations were opened, and every text a turn was asked with. */
  opened: number;
  readonly said: string[];
  /** Opening a conversation answers 503, as an agent that is starting does. */
  down: boolean;
  /** A reply writes its first piece and then nothing, until its turn is stopped. */
  stalled: boolean;
  /** The turns under way, by room: each stops its reply. */
  readonly turns: Map<string, () => void>;
  /** What the agent keeps of each conversation, by its id, as eliza's history routes show it. */
  readonly kept: Map<string, Kept>;
  /** Searching answers 500. */
  searchDown: boolean;
  /** The acknowledgment the agent writes with its first tool call, before its reply. */
  acknowledgment?: string;
  /** What each turn told the agent beside its text, as it arrived. */
  metadata?: unknown[];
  /** The code of the error frame the agent writes instead of a reply, as eliza's agent does when Cloud refuses the turn. */
  refusal?: string;
}

/** One conversation as the agent keeps it: its room, title and messages. */
export interface Kept {
  readonly roomId: string;
  readonly title: string;
  readonly messages: { id: string; role: "user" | "assistant"; text: string }[];
}

export function askScene(): AskScene {
  return { opened: 0, said: [], down: false, stalled: false, turns: new Map(), kept: new Map(), searchDown: false };
}

const encoder = new TextEncoder();
const frame = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
/** What ends a turn, as eliza's agent names its messages (`.eliza/packages/agent/src/client/reply-frame.schema.vibe`, `DoneFrame`). */
const named = (turn: number) => ({ messageId: `m${turn}`, userMessageId: `u${turn}`, agentName: "Alpha", actionResults: [] });

/** A streamed reply as eliza's agent writes one: what was said back in two pieces, or one piece that waits to be stopped. */
function reply(scene: AskScene, room: string, text: string, keep: (said: string) => void): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(frame({ type: "status", activity: "thinking" }));
      if (scene.refusal !== undefined) controller.enqueue(frame({ type: "error", code: scene.refusal, message: "Cloud refused the turn" }));
      if (scene.refusal !== undefined) return controller.close();
      if (scene.acknowledgment !== undefined) controller.enqueue(frame({ type: "acknowledgment", text: scene.acknowledgment }));
      if (scene.acknowledgment !== undefined) controller.enqueue(frame({ type: "tool", name: "CALENDAR", label: "Using Calendar" }));
      if (scene.stalled) {
        controller.enqueue(frame({ type: "token", text: "Thinking" }));
        scene.turns.set(room, () => controller.close());
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
      return Response.json({ conversations: [...scene.kept].map(([id, one]) => ({ id, roomId: one.roomId, title: one.title, createdAt: 0, updatedAt: 0 })) });
    },
    (request, url) => {
      const id = /^\/api\/conversations\/([^/]+)\/messages$/.exec(url.pathname)?.[1];
      if (request.method !== "GET" || id === undefined || id === "messages") return;
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
        if (found[2] === undefined) return Response.json({ text: `You said: ${body.text}`, ...named(scene.said.length) });
        scene.said.push(body.text);
        keep("user", body.text);
        return reply(scene, `r${found[1]}`, body.text, (said) => keep("assistant", said));
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
  ];
}
