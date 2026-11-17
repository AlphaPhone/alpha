// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Machine as Reminders } from "../gen/app__sample.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { button, closeAll, hardware, later, open, press, underAct, until } from "./alpha.tsx";
import { push } from "./fakes/sample.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const shown = () => [...document.querySelectorAll("section[aria-label=Reminders] li span")].map((title) => title.textContent);
const told = () => document.querySelector("section[aria-label=Reminders] [role=alert]")?.textContent;

// spec/app/sample/index.md, "Story: See and dismiss reminders"
it("See and dismiss reminders (spec/app/sample/index.md, \"Story: See and dismiss reminders\")", async () => {
  const world = scene();
  const first = await open(world);
  const { alpha } = first;

  // spec/app/sample/index.md, "Shown, the list is read and its feed opened under the next tickets; hidden, the feed is closed"
  await press("Notes");
  await until(alpha.runtime, Reminders, (s) => s.list.status === "Loaded" && s.feed.open);
  expect([shown(), world.sample.feeds.size]).toEqual([["Water the plants", "Call the bank"], 1]);

  // spec/app/sample/index.md, "Only the open feed's pushes are taken, until it drops"
  push(world.sample, ["Water the plants", "Call the bank", "Buy bread"]);
  await until(alpha.runtime, Reminders, (s) => s.titles.length === 3);
  expect(shown()).toEqual(["Water the plants", "Call the bank", "Buy bread"]);

  // spec/app/sample/index.md, "Undo within the five seconds puts the reminder back"
  await press("Dismiss Water the plants");
  expect([shown(), document.activeElement?.textContent]).toEqual([["Call the bank", "Buy bread"], "Undo dismissing “Water the plants”"]);
  await later(alpha, 4_000);
  await press("Undo dismissing “Water the plants”");
  await until(alpha.runtime, Reminders, (s) => s.undo.holding === "Undone");
  expect([shown(), world.sample.asked]).toEqual([["Call the bank", "Buy bread", "Water the plants"], []]);

  // spec/app/sample/index.md, "Once the five seconds are over the deletion is recorded as sent, and only then asked of the agent"
  await press("Dismiss Water the plants");
  await later(alpha, 5_000);
  await until(alpha.runtime, Reminders, (s) => s.deletion.attempt.outcome === "Confirmed");
  expect([world.sample.deleted, Boolean(button("Undo dismissing “Water the plants”"))]).toEqual([["Water the plants"], false]);

  // spec/app/shell/index.md, "Back closes one layer: the drawer, then Ask Alpha by a step, then the app on top"
  await hardware(world, "back");
  await until(alpha.runtime, Reminders, (s) => !s.showing);
  await until(alpha.runtime, Shell, (s) => s.trail.length === 0);
  expect(world.sample.feeds.size).toBe(0);

  // spec/app/sample/index.md, "When Alpha opens again, a read and a hold under way are taken up again, the feed is closed, and a deletion sent is unknown"
  await press("Notes");
  await until(alpha.runtime, Reminders, (s) => s.list.status === "Loaded");
  world.sample.stalled = true;
  await press("Dismiss Call the bank");
  await later(alpha, 5_000);
  await until(alpha.runtime, Reminders, (s) => s.deletion.attempt.outcome === "Sent");
  expect(world.sample.asked).toEqual(["Water the plants", "Call the bank"]);
  await first.close();

  world.sample.stalled = false;
  const second = await open(world);
  await until(second.alpha.runtime, Reminders, (s) => s.deletion.attempt.outcome === "Unknown" && s.list.status === "Loaded");
  expect([told(), world.sample.asked]).toEqual(["Alpha cannot tell whether the agent deleted “Call the bank”", ["Water the plants", "Call the bank"]]);

  await press("Dismiss Buy bread");
  await second.close();
  const third = await open(world);
  await until(third.alpha.runtime, Reminders, (s) => s.undo.holding === "Held");
  expect(shown()).not.toContain("Buy bread");
  await later(third.alpha, 15_000);
  await until(third.alpha.runtime, Reminders, (s) => s.deletion.attempt.outcome === "Confirmed");
  expect(world.sample.deleted).toEqual(["Water the plants", "Buy bread"]);
});
