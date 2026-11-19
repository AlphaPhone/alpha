// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import { button, closeAll, fill, openOver, press, stored, underAct, until } from "./alpha.tsx";
import { type DeviceKey, mailedCode, scratch, startAgent, startCloud, signIn } from "./eliza/services.ts";
import { elizaWorld } from "./eliza/world.vibe";
import { scene } from "./fakes/scene.ts";

// The real eliza agent and cloud of eliza.lock.json, each its own Node process over this file's own state directory.
const owner = "owner@alpha.test";
const granted = 1_000_000;
let cloud: Awaited<ReturnType<typeof startCloud>>;
let agent: Awaited<ReturnType<typeof startAgent>>;
let key: DeviceKey;

underAct();
beforeAll(async () => {
  const state = scratch();
  cloud = await startCloud(state);
  // spec/app/ask/index.md, "Story: Talk to my agent": the owner signs in by the code the cloud mails, and the device is given its key.
  key = await signIn(cloud, owner);
  await cloud.credit(key.organizationId, granted, "journey");
  agent = await startAgent(state, cloud, key);
}, 600_000);
afterEach(closeAll);
afterAll(async () => {
  await agent?.stop();
  await cloud?.stop();
});

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] ol li")].map((line) => line.textContent);

// spec/app/ask/index.md, "Story: Talk to my agent"
it("Talk to my agent, through eliza's agent and cloud (spec/app/ask/index.md, \"Story: Talk to my agent\")", async () => {
  expect([await mailedCode(cloud, owner), key.accountId === "", key.token === ""]).toEqual([expect.stringMatching(/^\d{6}$/), false, false]);
  const { alpha } = await openOver(elizaWorld(scene(), stored, { agent, cloud }));
  const asking = (await import("../src/ask/index.tsx")).default.runtime(alpha);

  // spec/app/ask/index.md, "The conversation is the one the agent names in answer to that opening, or none when it does not"
  await until(asking, Ask, (s) => s.conversation !== "");

  // spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
  await cloud.script({ kind: "text", parts: ["Hello ", "from ", "the cloud."] });
  await fill("Ask Alpha", "Say hello.");
  await press("Send");
  // spec/app/ask/index.md, "Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish"
  await until(asking, Ask, (s) => s.turn.outcome === "Confirmed");
  expect(lines()).toEqual(["Say hello.", "Hello from the cloud."]);
  // The cloud's model was asked as Alpha, with what the owner said, and the owner's organization was charged for it.
  expect((await cloud.asked()).at(-1)).toEqual([{ role: "system", content: "You are Alpha, the owner's phone agent." }, { role: "user", content: "Say hello." }]);
  const ledger = await cloud.ledger(key.organizationId);
  expect([ledger.charges.map((charge) => charge.outcome), (ledger.charges[0]?.charged ?? 0) > 0, ledger.balance < granted]).toEqual([["known"], true, true]);

  // spec/app/ask/index.md, "The owner stops the reply under way once, and the agent is asked to stop that conversation's turn"
  await cloud.script({ kind: "stall", first: "Thinking" });
  await fill("Ask Alpha", "Take your time.");
  await press("Send");
  await until(asking, Ask, (s) => s.reply === "Thinking");
  expect(Boolean(button("Send"))).toBe(false);
  await press("Stop");
  await until(asking, Ask, (s) => s.turn.outcome === "Refused");
  expect([lines(), document.querySelector("section[aria-label='Ask Alpha'] [role=alert]")?.textContent]).toEqual([["Say hello.", "Hello from the cloud.", "Take your time.", "Thinking"], "The reply stopped"]);
}, 300_000);
