// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Ask } from "../gen/app__ask.effect.vibe";
import ask from "../src/ask/index.tsx";
import { button, closeAll, fill, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] ol li")].map((line) => line.textContent);

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/ask/index.md, "Story: Talk to my agent"
  it("Talk to my agent (spec/app/ask/index.md, \"Story: Talk to my agent\")", async () => {
    const world = { ...scene(), phone };
    world.ask.down = true;
    const { alpha } = await open(world);
    const asking = ask.runtime(alpha);

    // spec/app/ask/index.md, "The conversation is the one the agent names in answer to that opening, or none when it does not"
    // spec/kit/attempt.md, "A sent attempt ends as its own answer says, or as unknown when no answer can be trusted": an agent that answers 503 may have opened one.
    await until(alpha, asking, Ask, (s) => s.opening.outcome === "Unknown");
    expect([Boolean(button("Send")), world.ask.opened]).toEqual([false, 0]);
    world.ask.down = false;
    await press("Try again");
    await until(alpha, asking, Ask, (s) => s.conversation === "c1");

    // spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
    await fill("Ask Alpha", "Hello");
    await press("Send");
    // spec/app/ask/index.md, "Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish"
    await until(alpha, asking, Ask, (s) => s.turn.outcome === "Confirmed");
    expect([lines(), world.ask.said]).toEqual([["Hello", "You said: Hello"], ["Hello"]]);

    // spec/app/ask/index.md, "The owner stops the reply under way once, and the agent is asked to stop that conversation's turn"
    world.ask.stalled = true;
    await fill("Ask Alpha", "Wait");
    await press("Send");
    await until(alpha, asking, Ask, (s) => s.reply === "Thinking");
    expect([Boolean(button("Send")), world.ask.turns.size]).toEqual([false, 1]);
    await press("Stop");
    await until(alpha, asking, Ask, (s) => s.turn.outcome === "Refused");
    expect([lines(), world.ask.turns.size, document.querySelector("section[aria-label='Ask Alpha'] [role=alert]")?.textContent]).toEqual([["Hello", "You said: Hello", "Wait", "Thinking"], 0, "The reply stopped"]);
  });
});
