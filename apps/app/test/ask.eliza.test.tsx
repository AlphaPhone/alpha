// @vitest-environment happy-dom
import { Effect } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, beforeAll, expect, it } from "vitest";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import ask from "../src/ask/index.tsx";
import { Agent } from "../src/platform/agent.vibe";
import { Cloud } from "../src/platform/cloud.vibe";
import { button, closeAll, fill, openOver, press, underAct, until } from "./alpha.tsx";
import { owned } from "@repo/eliza-harness/owned";
import { elizaWorld } from "./eliza/world.vibe";

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
  expect([mine.key.mailed, mine.key.accountId === "", mine.agent.token === ""]).toEqual([expect.stringMatching(/^\d{6}$/), false, false]);
  const { alpha } = await openOver(elizaWorld(mine));
  const asking = ask.runtime(alpha);
  const balance = async () => (await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => Effect.promise(() => cloud.client.snapshot())))).balance.usdMicros;
  expect(await balance()).toBe(mine.granted);

  // spec/app/ask/index.md, "The conversation is the one the agent names in answer to that opening, or none when it does not"
  await until(alpha, asking, Ask, (s) => s.conversation !== "");

  // spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
  await mine.script({ kind: "text", parts: ["Hello ", "from ", "the cloud."] });
  await fill("Ask Alpha", "Say hello.");
  await press("Send");
  // spec/app/ask/index.md, "Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish"
  await until(alpha, asking, Ask, (s) => s.turn.outcome === "Confirmed");
  expect(lines()).toEqual(["Say hello.", "Hello from the cloud."]);
  expect((await mine.asked()).at(-1)).toEqual([{ role: "system", content: expect.stringContaining(mine.system) }, { role: "user", content: expect.stringMatching(/^Say hello\.(\n|$)/) }]);
  expect(await balance()).toBeLessThan(mine.granted);

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

// spec/kit/read.md, "Story: Read from outside"
it("Read what my agent keeps, from eliza's agent with its modules loaded (spec/kit/read.md, \"Story: Read from outside\")", async () => {
  const { alpha } = await openOver(elizaWorld(mine), []);
  const read = (route: string) => alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => agent.call(HttpClientRequest.get(route))));
  // spec/kit/read.md, "Only the newest ticket's answer is taken, once": each route an area reads answers at the pinned commit, through Alpha's own Agent service.
  expect(await read("/api/approvals")).toMatchObject({ approvals: [] });
  expect(await read("/api/notifications")).toMatchObject({ notifications: [], unreadCount: 0 });
  expect(await read("/api/scheduled-tasks?ownerVisibleOnly=1")).toEqual({ tasks: [] });
  expect(await read("/api/triggers")).toEqual({ triggers: [] });
  expect(await read("/api/tasks/current")).toEqual({ task: null });
  expect(await read("/api/client-devices/capabilities")).toMatchObject({ protocol: 1 });
  const found = await read("/api/conversations/messages/search?q=hello") as { results: { text: string }[] };
  expect(found.results.map((one) => one.text)).toContain("Say hello.");
  expect((await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => Effect.promise(() => cloud.client.account())))).email).toBe("ask@alpha.test");
  const { conversations } = await read("/api/conversations") as { conversations: { id: string }[] };
  const { messages } = await read(`/api/conversations/${conversations[0]?.id}/messages`) as { messages: { role: string; text: string }[] };
  expect(messages.slice(0, 2)).toEqual([expect.objectContaining({ role: "user", text: "Say hello." }), expect.objectContaining({ role: "assistant", text: "Hello from the cloud." })]);
}, 300_000);
