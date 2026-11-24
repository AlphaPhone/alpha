import { type Reply, said } from "./services.ts";
import type { Owned } from "./setup.ts";

/**
 * The owner of the journey file `test/<name>.eliza.test.tsx` on the run's one local cloud: signed in by the code the
 * cloud mailed, given a device key, funded, with an agent of their own started under that key, which keeps nothing
 * between runs. No two journeys share an agent, an account or a ledger. The model is the cloud's scripted provider.
 */
export async function owned(name: string) {
  const { inject } = await import("vitest");
  const mine = await said<Owned>(`${inject("eliza")}/?owner=${name}`);
  const operator = <A>(route: string, body?: unknown) => said<A>(`${mine.cloud.provider}/operator/${route}`, { body });
  return {
    ...mine,
    script: (reply: Reply) => operator("model", { system: mine.system, reply }),
    asked: () => operator<{ role: string; content?: unknown }[][]>(`asked?system=${encodeURIComponent(mine.system)}`),
    agentSays: <A>(route: string, body?: unknown) => said<A>(`${mine.agent.origin}${route}`, { body, headers: { authorization: `Bearer ${mine.agent.token}` } }),
  };
}
