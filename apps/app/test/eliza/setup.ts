// Vitest's global setup: eliza's cloud and agents for the journeys that ask for them (owned.ts), started on the first
// asking and stopped with the run. A run that asks for none starts none.
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { type Agent, type Cloud, type DeviceKey, characterOf, mailedCode, scratch, signIn, startAgent, startCloud } from "./services.ts";

/** What a journey is told of its owner: where their agent and the cloud answer, their account, and the code the cloud mailed them. */
export interface Owned {
  readonly agent: { readonly origin: string; readonly token: string };
  readonly cloud: { readonly local: string };
  readonly key: Pick<DeviceKey, "accountId" | "organizationId">;
  readonly system: string;
  readonly mailed: string;
  readonly granted: number;
}

declare module "vitest" {
  export interface ProvidedContext {
    /** Where this run's eliza services are asked for. */
    eliza: string;
  }
}

/** The credits each journey's owner is given: enough for its turns, and little enough that a charge shows. */
const granted = 1_000_000;

export default async function setup(project: TestProject) {
  const state = scratch();
  let cloud: Promise<Cloud> | undefined;
  const agents: Agent[] = [];
  const owners = new Map<string, Promise<Owned>>();
  /** One cloud for the run, and for each name one owner on it, signed in by the mailed code, funded, with an agent of their own that keeps nothing. */
  async function owned(name: string): Promise<Owned> {
    const running = await (cloud ??= startCloud(state));
    const email = `${name}@alpha.test`;
    const key = await signIn(running, email);
    await running.credit(key.organizationId, granted, `journey-${name}`);
    const character = characterOf(email);
    const agent = await startAgent(path.join(state, name), running, key, character, false);
    agents.push(agent);
    return { agent: { origin: agent.origin, token: agent.token }, cloud: { local: running.local }, key: { accountId: key.accountId, organizationId: key.organizationId }, system: character.system, mailed: await mailedCode(running, email), granted };
  }
  const server = http.createServer((request, response) => {
    const name = new URL(request.url ?? "/", "http://setup").searchParams.get("owner") ?? "";
    if (!/^[a-z][a-z0-9-]*$/.test(name)) return void response.writeHead(400).end();
    let asked = owners.get(name);
    if (!asked) owners.set(name, asked = owned(name));
    asked.then((found) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(found)), (cause: unknown) => response.writeHead(500).end(String(cause)));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  project.provide("eliza", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  return async () => {
    server.close();
    await Promise.allSettled([...owners.values()]);
    for (const agent of agents) await agent.stop();
    await (await cloud?.catch(() => undefined))?.stop();
    fs.rmSync(state, { recursive: true, force: true });
  };
}
