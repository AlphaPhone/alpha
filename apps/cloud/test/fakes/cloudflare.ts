// spec/cloud/rollout.md, "Story: Create an environment's Cloudflare resources once"
import http from "node:http";
import type { AddressInfo } from "node:net";

/** A Hyperdrive configuration as Cloudflare's API lists it. */
export interface Hyperdrive {
  readonly id: string;
  readonly name: string;
  readonly origin: Record<string, unknown>;
  readonly caching: { readonly disabled: boolean };
}

/** Cloudflare's v4 API, for the one account and zone a journey sets up: the zone, Hyperdrive, Worker domains and DNS records, kept in memory. */
export interface FakeCloudflare {
  readonly base: string;
  readonly hyperdrives: Hyperdrive[];
  readonly requests: string[];
  stop(): Promise<void>;
}

const envelope = (result: unknown) => JSON.stringify({ success: true, errors: [], result, result_info: { page: 1, per_page: 50 } });

/** Start the fake: `account` owns `zone`, and only `token` is admitted. */
export async function startCloudflare(at: { readonly account: string; readonly zone: string; readonly token: string; readonly hyperdrives?: Hyperdrive[] }): Promise<FakeCloudflare> {
  const hyperdrives = [...(at.hyperdrives ?? [])];
  const requests: string[] = [];
  const zoneId = "a".repeat(32);
  const server = http.createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8").on("data", (part: string) => { body += part; }).on("end", () => {
      const url = new URL(request.url ?? "/", "http://cloudflare");
      requests.push(`${request.method} ${url.pathname}`);
      const answer = (status: number, text: string) => response.writeHead(status, { "content-type": "application/json" }).end(text);
      if (request.headers.authorization !== `Bearer ${at.token}`) return answer(403, JSON.stringify({ success: false, errors: [{ code: 10000 }] }));
      if (url.pathname === "/zones") return answer(200, envelope(url.searchParams.get("name") === at.zone ? [{ id: zoneId, name: at.zone, account: { id: at.account } }] : []));
      if (url.pathname === `/accounts/${at.account}/hyperdrive/configs` && request.method === "GET") return answer(200, envelope(hyperdrives));
      if (url.pathname === `/accounts/${at.account}/hyperdrive/configs` && request.method === "POST") {
        const asked = JSON.parse(body) as { name: string; origin: Record<string, unknown>; caching: { disabled: boolean } };
        const { password: _password, ...origin } = asked.origin;
        const created = { id: (hyperdrives.length + 1).toString(16).padStart(32, "b"), name: asked.name, origin, caching: asked.caching };
        hyperdrives.push(created);
        return answer(200, envelope(created));
      }
      if (url.pathname === `/accounts/${at.account}/workers/domains`) return answer(200, envelope([]));
      if (url.pathname === `/zones/${zoneId}/dns_records`) return answer(200, envelope([]));
      return answer(404, JSON.stringify({ success: false, errors: [{ code: 7003 }] }));
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, hyperdrives, requests, stop: () => new Promise<void>((done) => server.close(() => done())) };
}
