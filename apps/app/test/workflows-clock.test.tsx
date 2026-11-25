// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import * as Clock from "../gen/app__workflows__clock.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import clockPage from "../src/workflows/clockPage.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, fill, hardware, open, press, seen, underAct, until } from "./alpha.tsx";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

type State = Clock.Clock;

const page = (alpha: Alpha, ok: (state: State) => boolean) => until(alpha, clockPage.runtime(alpha), Clock.Machine, ok);

/** Alpha over `world`, in Workflows, with the Clock page open and its last handoff read where there is a Clock. */
async function clockOpen(world: Scene) {
  const running = await open(world);
  if (button("Workflows")) await press("Workflows");
  await until(running.alpha, running.alpha.runtime, Shell, (s) => s.trail.at(-1) === "Workflows");
  await press("Android Clock");
  await page(running.alpha, (s) => s.open && (!s.clock || s.history.status === "Loaded"));
  return running;
}

describe("Clock", () => {
  it("Describe an alarm, review it and hand it to Clock (spec/app/workflows/clock.md, \"Story: Describe an alarm for Clock\"; spec/app/workflows/clock.md, \"Story: Review, then hand over to Clock\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await clockOpen(world);
    // spec/app/workflows/clock.md, "Repeat days are offered only on a phone that carries them to Clock"
    await page(alpha, (s) => s.repeats);
    await fill("Alarm time", "06:30");
    await fill("Alarm label", "Gym");
    await press("Repeat on Monday");
    await press("Repeat on Wednesday");
    // spec/app/workflows/clock.md, "Review shows the request as it is, once the last handoff has been read"
    await press("Review");
    // spec/app/workflows/clock.md, "Clock is opened once the handoff is kept, with exactly what was reviewed, and a handoff that could not be kept is not sent"
    await press("Open Clock");
    await page(alpha, (s) => s.receipt === "ClockOpened");
    expect(world.settings.clocks).toEqual([{ action: "set", hour: 6, minute: 30, label: "Gym", days: [2, 4] }]);
    // spec/app/workflows/clock.md, "A review ends when Alpha is hidden or the page is closed, and a handoff not yet sent is withdrawn": hidden, the review closes and nothing more is sent.
    await press("Review");
    await seen(false);
    await page(alpha, (s) => !s.review.showing);
    await seen(true);
    expect([button("Open Clock"), world.settings.clocks.length]).toEqual([undefined, 1]);
    // spec/app/workflows/clock.md, "A snooze asks for 1 to 60 minutes"
    world.settings.clock = "unknown";
    await press("Snooze");
    await fill("Snooze minutes", "60");
    await press("Review");
    await press("Open Clock");
    // spec/app/workflows/clock.md, "Clock's answer to the handoff still open ends it: opened, refused, or unknown"
    await page(alpha, (s) => s.receipt === "Unclear");
    expect(world.settings.clocks.at(-1)).toEqual({ action: "snooze", minutes: 60 });
    // spec/app/workflows/clock.md, "A review ends when Alpha is hidden or the page is closed, and a handoff not yet sent is withdrawn": Back closes the page and stays in Workflows.
    await hardware("back");
    await page(alpha, (s) => !s.open);
    expect([button("Android Clock") !== undefined, (await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail.at(-1)]).toEqual([true, "Workflows"]);
  });

  it("Know what happened after a restart (spec/app/workflows/clock.md, \"Story: Know what happened\")", async () => {
    const world = { ...scene(), phone: true };
    const first = await clockOpen(world);
    await press("Show alarms");
    await press("Review");
    await press("Open Clock");
    await page(first.alpha, (s) => s.receipt === "ClockOpened");
    await first.close();
    // spec/app/workflows/clock.md, "Only the newest read is taken: it shows the last handoff and what Clock answered, and once a phone is known to carry repeat days it stays known"
    const { alpha } = await clockOpen(world);
    await page(alpha, (s) => s.lastKind === "ShowAlarms" && s.lastReceipt === "ClockOpened" && s.receipt === "NoReceipt");
    expect(world.settings.clocks).toEqual([{ action: "show" }]);
  });

  it("A browser has no Clock to hand over to (spec/app/workflows/clock.md, \"A repeating alarm can be described, and the page can open where there is no Clock\")", async () => {
    const world = scene();
    const { alpha } = await clockOpen(world);
    await page(alpha, (s) => s.open && !s.clock && s.history.status === "Idle");
    expect([button("Review"), world.settings.clocks]).toEqual([undefined, []]);
  });
});
