import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { TestProject } from "vitest/node";
import { type Agent, type Cloud, type DeviceKey, characterOf, scratch, startAgent, startCloud } from "./services.ts";

/** What a journey is told of its owner: where their agent, the cloud and the scripted model answer, and their account and device key. */
export interface Owned {
  readonly agent: { readonly origin: string; readonly token: string };
  readonly cloud: { readonly local: string; readonly provider: string };
  readonly key: DeviceKey;
  readonly system: string;
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
const journeys = /^(.+)\.eliza\.test\.tsx$/;

export default async function setup(project: TestProject) {
  const state = scratch();
  const names = fs.readdirSync(path.join(import.meta.dirname, "..")).flatMap((file) => journeys.exec(file)?.[1] ?? []);
  const email = (name: string) => `${name}@alpha.test`;
  let cloud: Promise<Cloud> | undefined;
  const agents: Agent[] = [];
  const owners = new Map<string, Promise<Owned>>();
  async function owned(name: string): Promise<Owned> {
    const running = await (cloud ??= startCloud(state, names.map(email), granted));
    const key = running.owners.get(email(name));
    if (key === undefined) throw new Error(`no owner ${name}: an owner is named after its journey's file, test/${name}.eliza.test.tsx`);
    const character = characterOf(email(name));
    const agent = await startAgent(path.join(state, name), running, key, character, false);
    agents.push(agent);
    return { agent: { origin: agent.origin, token: agent.token }, cloud: { local: running.local, provider: running.provider }, key, system: character.system, granted };
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
