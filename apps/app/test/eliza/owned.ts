// What a journey over eliza's real agent and cloud asks for: `await owned("<area>")`, in a `beforeAll` given ten minutes.
import { inject } from "vitest";
import type { Reply } from "./cloud-host.ts";
import { said } from "./services.ts";
import type { Owned } from "./setup.ts";

/**
 * This journey's own owner on the run's one local cloud: signed in by the code the cloud mailed, given a device key,
 * funded, with an agent of their own started under that key, which keeps nothing between runs. Name the owner after
 * the area, so that no two journeys share an agent, an account or a ledger. The model is the cloud's scripted one.
 */
export async function owned(name: string) {
  const mine = await said<Owned>(`${inject("eliza")}/?owner=${name}`);
  const operator = <A>(route: string, body?: unknown) => said<A>(`${mine.cloud.local}/operator/${route}`, { body });
  return {
    ...mine,
    /** What the model says to this owner's agent next, in place of repeating the owner. */
    script: (reply: Reply) => operator("model", { system: mine.system, reply }),
    /** The messages of every call this owner's agent has made to the model. */
    asked: () => operator<{ role: string; content?: unknown }[][]>(`asked?system=${encodeURIComponent(mine.system)}`),
    /** What this owner's organization has left, and each charge made to it. */
    ledger: () => operator<{ balance: number; charges: { charged: number; outcome: string }[] }>(`ledger?organizationId=${mine.key.organizationId}`),
  };
}
