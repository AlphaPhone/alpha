// spec/maps/connection.md, "Every Maps request goes through the Cloud client, with its own request key, and a tile comes back as its image": the fake Cloud's HTTP face, for the typed Cloud client the Maps provider sends through.

/** What the fake Cloud answered one request: its JSON body, or a refusal with its status and Retry-After seconds. */
export type FakeCloudAnswer =
  | { readonly ok: true; readonly body: unknown }
  | { readonly ok: false; readonly status: number; readonly retryAfter?: number };

/** A fetch over the fake Cloud: each request's path and JSON body, answered as Cloud sends it. @throws {never} */
export function cloudFetch(answer: (path: string, body: unknown) => Promise<FakeCloudAnswer>): typeof globalThis.fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const text = request.method === "GET" ? "" : await request.text();
    const said = await answer(new URL(request.url).pathname, text === "" ? undefined : JSON.parse(text));
    if (said.ok) return new Response(JSON.stringify(said.body), { status: 200, headers: { "content-type": "application/json" } });
    const wait = said.retryAfter;
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: said.status,
      headers: { "content-type": "application/json", ...(wait === undefined ? {} : { "retry-after": String(wait) }) },
    });
  };
}
