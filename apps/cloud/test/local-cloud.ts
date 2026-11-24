// spec/cloud/rollout.md, "Story: Tell whether a deployed environment is ready"
import fs from "node:fs";
import path from "node:path";
import type { CloudProfile } from "@elizaos/cloud/profile";
import { ended, freePort, paymentKey, plans, scratch, served, startProvider } from "@repo/eliza-harness";
import type { EdgeEnv } from "../src/edge.vibe";
import { edgeWorker } from "../src/edge.vibe";
import type { Hosts } from "../gen/cloud.ts";

/** The plan ids the payment provider's fake sells, as the operator records them. */
export const fakePlans = Object.fromEntries(Object.entries(plans).map(([plan, { priceId, productId }]) => [plan, { priceId, productId }])) as { plus_monthly: { priceId: string; productId: string }; pro_monthly: { priceId: string; productId: string } };

/** A local Alpha Cloud: eliza's cloud command serving the staging profile over PGlite, and the fetch a phone would use to reach its two hosts. */
export interface LocalCloud {
  readonly fetch: typeof globalThis.fetch;
  stop(): Promise<void>;
}

/**
 * Serve `profile`'s staging environment with eliza's own cloud command over a PGlite database of this run, seeded with
 * `seed`, the payment provider faked at its network boundary. Its API host is the command's listener, and its web
 * host is Alpha's web host Worker in this process, bound to that listener as its API Worker.
 */
export async function startLocalCloud(build: (billingApi: string) => { readonly profile: CloudProfile; readonly seed: unknown; readonly secrets: Readonly<Record<string, string>>; readonly hosts: Hosts }): Promise<LocalCloud> {
  const state = scratch();
  const provider = await startProvider("unused");
  const { profile, seed, secrets, hosts } = build(`${provider.origin}/stripe`);
  const file = (name: string, text: string) => { fs.writeFileSync(path.join(state, name), text, { mode: 0o600 }); return path.join(state, name); };
  const secretsFile = file("secrets.env", Object.entries({ ...secrets, STRIPE_SECRET_KEY: paymentKey }).map(([name, value]) => `${name}=${value}`).join("\n"));
  const local = `http://127.0.0.1:${await freePort()}`;
  const port = new URL(local).port;
  const child = await served(secretsFile, ["--profile", file("profile.json", JSON.stringify(profile)), "--environment", "staging", "--store", `pglite:${path.join(state, "cloud.pglite")}`,
    "--seed", file("seed.json", JSON.stringify(seed)), "--port", port, "--host", "127.0.0.1"], local);
  const onApi = (url: URL) => `${local}${url.pathname}${url.search}`;
  const api = (request: Request) => globalThis.fetch(onApi(new URL(request.url)), { method: request.method, headers: request.headers, redirect: "manual" });
  const env: EdgeEnv = { CLOUD_ENVIRONMENT: "staging", PUBLIC_API_ORIGIN: hosts.api, WEB_ORIGIN: hosts.web, API: { fetch: api } };
  const reach: typeof globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin === hosts.web) return edgeWorker.fetch(request, env);
    if (url.origin === hosts.api) return api(request);
    return Promise.reject(new TypeError(`no such host in this run: ${url.origin}`));
  };
  return {
    fetch: reach,
    stop: async () => { await ended(child); await provider.stop(); fs.rmSync(state, { recursive: true, force: true }); },
  };
}
