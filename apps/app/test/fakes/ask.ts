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
}

export function askScene(): AskScene {
  return { opened: 0, said: [], down: false, stalled: false, turns: new Map() };
}

const encoder = new TextEncoder();
const frame = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

/** A streamed reply as eliza's agent writes one: what was said back in two pieces, or one piece that waits to be stopped. */
function reply(scene: AskScene, room: string, text: string): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (scene.stalled) {
        controller.enqueue(frame({ type: "token", text: "Thinking", fullText: "Thinking" }));
        scene.turns.set(room, () => {
          controller.enqueue(frame({ type: "error", message: "The turn did not complete" }));
          controller.close();
        });
        return;
      }
      controller.enqueue(frame({ type: "token", text: "You said: ", fullText: "You said: " }));
      controller.enqueue(frame({ type: "token", text, fullText: `You said: ${text}` }));
      controller.enqueue(frame({ type: "done", fullText: `You said: ${text}` }));
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
      return Response.json({ conversation: { id: `c${id}`, roomId: `r${id}`, title: "Ask Alpha", createdAt: 0, updatedAt: 0 } }, { status: 201 });
    },
    (request, url) => {
      const conversation = /^\/api\/conversations\/c(\d+)\/messages\/stream$/.exec(url.pathname)?.[1];
      if (request.method !== "POST" || conversation === undefined) return;
      return request.json().then((body: { text: string }) => {
        scene.said.push(body.text);
        return reply(scene, `r${conversation}`, body.text);
      });
    },
    (request, url) => {
      const room = /^\/api\/turns\/([^/]+)\/abort$/.exec(url.pathname)?.[1];
      if (request.method !== "POST" || room === undefined) return;
      const stop = scene.turns.get(room);
      scene.turns.delete(room);
      stop?.();
      return Response.json({ aborted: stop !== undefined });
    },
  ];
}
