/** One route of a fake service: its answer to `request`, or undefined to leave it to the next route. */
export type Route = (request: Request, url: URL) => Response | Promise<Response> | undefined;

/** A fake service: what it answers to a request. */
export type Answering = (request: Request) => Promise<Response>;

/**
 * What `answer` says to a request built as fetch builds one, abort signal included: the network boundary, for the
 * HttpClient of world.vibe.
 * @throws {never}
 */
export function fetched(answer: Answering, url: URL, init: { method: string; headers: Record<string, string>; body: BodyInit | Uint8Array | undefined; signal: AbortSignal }): Promise<Response> {
  const requestInit = init.body instanceof ReadableStream ? { ...init, duplex: "half" } : init;
  return answer(new Request(url, requestInit as RequestInit));
}

/** The service that answers by the first route that does, and 404 where none does. */
export function answering(routes: readonly Route[]): Answering {
  return async (request) => {
    const url = new URL(request.url);
    for (const route of routes) {
      const answer = route(request, url);
      if (answer) return answer;
    }
    return Response.json({ error: "no such route" }, { status: 404 });
  };
}

/** A Server-Sent Events answer that stays open; each `send` is one event, until the client goes away. */
export function feed(opened: (send: (data: unknown) => void) => () => void): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let close = () => {};
  const body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      close = opened((data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          close();
        }
      });
    },
    cancel: () => {
      if (closed) return;
      closed = true;
      close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

/** Parse a request JSON body into a plain record, returning an empty object on missing, array, or invalid JSON. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
