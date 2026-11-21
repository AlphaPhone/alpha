// @vitest-environment happy-dom
import { afterEach, beforeAll, expect, it } from "vitest";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import ask from "../src/ask/index.tsx";
import { button, closeAll, fill, openOver, press, underAct, until } from "./alpha.tsx";
import { owned } from "./eliza/owned.ts";
import { elizaWorld } from "./eliza/world.vibe";

// The real eliza agent and cloud of eliza.lock.json, each its own Node process: this journey's own owner and agent on the run's cloud.
let mine: Awaited<ReturnType<typeof owned>>;

underAct();
beforeAll(async () => {
  // spec/app/ask/index.md, "Story: Talk to my agent": the owner signs in by the code the cloud mails, and the device is given its key.
  mine = await owned("ask");
}, 600_000);
afterEach(closeAll);

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] ol li")].map((line) => line.textContent);

// spec/app/ask/index.md, "Story: Talk to my agent"
it("Talk to my agent, through eliza's agent and cloud (spec/app/ask/index.md, \"Story: Talk to my agent\")", async () => {
  expect([mine.mailed, mine.key.accountId === "", mine.agent.token === ""]).toEqual([expect.stringMatching(/^\d{6}$/), false, false]);
  const { alpha } = await openOver(elizaWorld(mine));
  const asking = ask.runtime(alpha);

  // spec/app/ask/index.md, "The conversation is the one the agent names in answer to that opening, or none when it does not"
  await until(alpha, asking, Ask, (s) => s.conversation !== "");

  // spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
  await mine.script({ kind: "text", parts: ["Hello ", "from ", "the cloud."] });
  await fill("Ask Alpha", "Say hello.");
  await press("Send");
  // spec/app/ask/index.md, "Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish"
  await until(alpha, asking, Ask, (s) => s.turn.outcome === "Confirmed");
  expect(lines()).toEqual(["Say hello.", "Hello from the cloud."]);
  // The cloud's model was asked as this owner's Alpha, with what the owner said, and the owner's organization was charged for it.
  expect((await mine.asked()).at(-1)).toEqual([{ role: "system", content: mine.system }, { role: "user", content: "Say hello." }]);
  const ledger = await mine.ledger();
  expect([ledger.charges.map((charge) => charge.outcome), (ledger.charges[0]?.charged ?? 0) > 0, ledger.balance < mine.granted]).toEqual([["known"], true, true]);

  // spec/app/ask/index.md, "The owner stops the reply under way once, and the agent is asked to stop that conversation's turn"
  await mine.script({ kind: "stall", first: "Thinking" });
  await fill("Ask Alpha", "Take your time.");
  await press("Send");
  await until(alpha, asking, Ask, (s) => s.reply === "Thinking");
  expect(Boolean(button("Send"))).toBe(false);
  await press("Stop");
  await until(alpha, asking, Ask, (s) => s.turn.outcome === "Refused");
  expect([lines(), document.querySelector("section[aria-label='Ask Alpha'] [role=alert]")?.textContent]).toEqual([["Say hello.", "Hello from the cloud.", "Take your time.", "Thinking"], "The reply stopped"]);
}, 300_000);
