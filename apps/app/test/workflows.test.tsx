// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Listing } from "../gen/app__workflows__list.effect.vibe";
import { Machine as Definition } from "../gen/app__workflows.effect.vibe";
import { Machine as Automations } from "../gen/app__workflows__automations.effect.vibe";
import { Machine as Runs } from "../gen/app__workflows__runs.effect.vibe";
import { Machine as Sheet } from "../gen/app__workflows__sheet.effect.vibe";
import { Machine as Clock } from "../gen/app__workflows__clock.effect.vibe";
import { Machine as Approvals } from "../gen/app__workflows__approvals.effect.vibe";
import workflows from "../src/workflows/index.tsx";
import home from "../src/home/index.tsx";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { button, closeAll, drawn, fill, later, only, open, press, pressOnTop, seen, underAct, until } from "./alpha.tsx";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rows = () => [...document.querySelectorAll("ul[aria-label=Workflows] li > button")];
const visible = (...names: string[]) => names.filter((name) => rows().some((row) => row.textContent?.startsWith(name)));
const choose = (name: string) => drawn(() => {
  const row = rows().find((one) => one.textContent?.startsWith(name));
  if (!(row instanceof HTMLButtonElement)) throw new Error(`No workflow named ${name}`);
  row.click();
});


async function openWorkflows(world: Scene) {
  const { alpha } = await open(world, only("home", "view:Workflows", "notice"));
  const runtime = home.runtime(alpha);
  await vi.waitFor(async () => {
    await drawn(() => undefined);
    const state = await runtime.runPromise(Home.use((machine) => machine.get()));
    expect(state.tiles.load.status).toBe("Loaded");
    expect(button("Workflows")).toBeDefined();
  }, { timeout: 15_000 });
  await press("Workflows");
  return alpha;
}

describe("Workflows", () => {
  it('Filters the owner’s work and keeps removed history (spec/app/workflows/list.md, "Story: Find a workflow")', async () => {
    const world = scene();
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && state.complete);
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Monthly statement", "Desk check"]);

    await press("Filter workflows");
    await pressOnTop("Removed");
    await pressOnTop("Done");
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);

    await choose("Retired brief");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.removed);
    await drawn(() => alpha.back());
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);

    world.workflows.failingPrompts = true;
    await press("Filter workflows");
    await pressOnTop("Refresh list");
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && !state.complete);
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual(["Retired brief"]);
  });

  it('Explores Add to Workflows while signed out (spec/app/workflows/list.md, "From the list the owner can open a row, Add to Workflows, or the digests; Back returns to the same filters")', async () => {
    const world = scene();
    world.signedIn = false;
    world.residentAvailable = false;
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.owner === 0 && state.place.tag === "ListingRows");
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual([]);
    await press("Add to Workflows");
    await until(alpha, area, Listing, (state) => state.place.tag === "ListingAdd");
    const choices = [...document.querySelectorAll<HTMLButtonElement>("main button")];
    expect(["Automation", "Reminder", "Scheduled digest"].map((name) => choices.find((item) => item.textContent?.startsWith(name))?.disabled)).toEqual([true, true, true]);
    await drawn(() => alpha.back());
    await until(alpha, area, Listing, (state) => state.place.tag === "ListingRows");
    expect(button("Add to Workflows")).toBeDefined();
    expect(visible("Monthly statement", "Desk check", "Retired brief")).toEqual([]);
  });

  it('Reviews a Clock request within its Alarms page and restores focus to the list (spec/app/workflows/clock.md, "Story: Review, then hand over to Clock")', async () => {
    const world = scene();
    world.phone = true;
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");

    await press("Add to Workflows");
    const opener = button("Clock alarms");
    expect(opener?.textContent).toBe("Alarm");
    await press("Clock alarms");
    await until(alpha, area, Clock, (state) => state.open && state.history.status === "Loaded");

    const alarm = document.querySelector('[role="dialog"][aria-label="Clock alarms"]');
    expect(alarm?.querySelector("h2")?.textContent).toBe("Alarms");
    expect(alarm?.querySelector('input[aria-label="Alarm time"]')).toBeInstanceOf(HTMLInputElement);
    await vi.waitFor(() => expect(document.activeElement).toBe(button("Close Clock")));

    await pressOnTop("Snooze");
    expect(alarm?.querySelector('input[aria-label="Snooze minutes"]')).toBeInstanceOf(HTMLInputElement);
    await pressOnTop("Review Clock request");
    expect(alarm?.querySelector('[aria-label="Clock review"]')?.textContent).toContain("Snooze: 10 min requested");
    expect(alarm?.querySelector('[aria-label="Confirm Clock request"]')?.textContent).toBe("Open Clock");

    await pressOnTop("Cancel Clock review");
    expect(alarm?.querySelector('[aria-label="Clock review"]')).toBeNull();
    await pressOnTop("Close Clock");
    await vi.waitFor(() => {
      expect(document.body.contains(alarm)).toBe(false);
      expect(document.activeElement).toBe(opener);
    });
  });

  it('Reviews the exact prompt before changing whether its schedule runs (spec/app/workflows/automations.md, "Turning a prompt on or off, removing an automation, and running it now require confirmation of the row and action shown")', async () => {
    const world = scene();
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && state.complete);
    await choose("Desk check");
    await until(alpha, area, Automations, (state) => state.present && state.list.status === "Loaded");
    const toggle = "Turn Desk check on or off";

    await press(toggle);
    expect(document.querySelector('[aria-label="Review workflow action"]')?.textContent).toContain('Pause “Desk check”?');
    expect(world.workflows.promptEdits).toEqual([]);
    await press("Cancel");
    expect(document.querySelector('[aria-label="Review workflow action"]')).toBeNull();
    expect(button(toggle)?.getAttribute("aria-checked")).toBe("true");
    expect(world.workflows.promptEdits).toEqual([]);

    await press(toggle);
    await press("Confirm Pause");
    await until(alpha, area, Automations, (state) => state.change.attempt.outcome === "Confirmed" && state.list.status === "Loaded" && !state.on);
    expect(world.workflows.promptEdits).toEqual([{ enabled: false, expectedRevision: 1 }]);
    expect(world.workflows.prompts.get("desk-check")).toMatchObject({ enabled: false, revision: 2 });

    await press(toggle);
    const changed = world.workflows.prompts.get("desk-check");
    if (changed === undefined) throw new Error("No Desk check prompt");
    world.workflows.prompts.set("desk-check", { ...changed, instructions: "Edited elsewhere", revision: 3 });
    await press("Confirm Enable");
    await until(alpha, area, Automations, (state) => state.change.attempt.outcome === "Refused");
    expect(world.workflows.promptEdits).toEqual([{ enabled: false, expectedRevision: 1 }, { enabled: true, expectedRevision: 2 }]);
    expect(world.workflows.prompts.get("desk-check")).toMatchObject({ enabled: false, instructions: "Edited elsewhere", revision: 3 });
  });

  it('Keeps the saved schedule while editing prompt instructions (spec/app/workflows/automations.md, "Story: Create or edit an automation on a schedule")', async () => {
    const world = scene();
    const existing = [
      { id: "single-prompt", displayName: "Call reminder", triggerType: "once", scheduledAtIso: "2027-02-08T14:15:00.000Z" },
      { id: "event-prompt", displayName: "Inbox event", triggerType: "event", eventKind: "inbox-delivered" },
      { id: "complex-prompt", displayName: "Monthly review", triggerType: "cron", cronExpression: "5 9 1 * *" },
      { id: "weekly-prompt", displayName: "Delivery review", triggerType: "cron", cronExpression: "13 8 * * 1-5" },
    ] as const;
    for (const prompt of existing) world.workflows.prompts.set(prompt.id, {
      ...prompt, instructions: "Review the details.", enabled: false, revision: 1, timezone: "America/Los_Angeles",
    });
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && state.complete);

    for (const { id, displayName, ...timing } of existing) {
      await choose(displayName);
      await until(alpha, area, Automations, (state) => state.present && state.list.status === "Loaded");
      await press("Edit prompt");
      await fill("Instructions", "Review the updated details.");
      await press("Review");
      await pressOnTop("Save changes");
      await until(alpha, area, Automations, (state) => state.change.attempt.outcome === "Confirmed");
      expect(world.workflows.promptEdits.at(-1)).toEqual({
        kind: "prompt", displayName, instructions: "Review the updated details.", timezone: "America/Los_Angeles",
        expectedRevision: 1, ...timing,
      });
      expect(world.workflows.prompts.get(id)).toMatchObject({ ...timing, instructions: "Review the updated details.", revision: 2 });
      await drawn(() => alpha.back());
      await until(alpha, area, Listing, (state) => state.place.tag === "ListingRows" && state.list.status === "Loaded");
    }

    await choose("Delivery review");
    await until(alpha, area, Automations, (state) => state.present && state.list.status === "Loaded");
    await press("Edit prompt");
    await press("Weekends");
    await press("Review");
    await pressOnTop("Save changes");
    await until(alpha, area, Automations, (state) => state.change.attempt.outcome === "Confirmed");
    expect(world.workflows.prompts.get("weekly-prompt")).toMatchObject({ cronExpression: "13 8 * * 0,6", revision: 3 });

    await until(alpha, area, Automations, (state) => state.present && state.list.status === "Loaded");
    await press("Edit prompt");
    await fill("Instructions", "One more update.");
    await press("Review");
    const current = world.workflows.prompts.get("weekly-prompt");
    if (!current) throw new Error("No weekly prompt");
    world.workflows.prompts.set("weekly-prompt", { ...current, revision: 4, instructions: "Changed in another session." });
    await pressOnTop("Save changes");
    await until(alpha, area, Automations, (state) => state.change.attempt.outcome === "Refused");
    expect(world.workflows.promptEdits.at(-1)).toMatchObject({ expectedRevision: 3 });
    expect(world.workflows.prompts.get("weekly-prompt")?.instructions).toBe("Changed in another session.");
  });

  it('Runs the reviewed version, follows its approval and opens its output (spec/app/workflows/runs.md, "Story: Run a workflow now"; spec/app/workflows/sheet.md, "Story: Read a run\'s sheet"; spec/app/workflows/approvals.md, "Story: Answer a run\'s approval on the phone")', async () => {
    const world = scene();
    world.workflows.stage = "Running";
    const alpha = await openWorkflows(world);
    const area = workflows.runtime(alpha);
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");
    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded");
    await until(alpha, area, Runs, (state) => state.reading.status === "Loaded");
    await press("Run now");
    await press("Confirm run");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.shown === 1);
    expect(world.workflows.admissions).toHaveLength(1);
    expect(world.workflows.admissions[0]?.version).toBe("monthly-statement-v3");
    await drawn(() => {
      const row = document.querySelector<HTMLButtonElement>('[aria-label="Run history"] li > button');
      if (!row) throw new Error("No run history");
      row.click();
    });
    await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.status === "Running");
    await seen(false);
    const reads = world.workflows.receiptReads;
    world.workflows.stage = "Waiting";
    await later(alpha, 8_000);
    expect(world.workflows.receiptReads).toBe(reads);

    await seen(true);
    await later(alpha, 4_000);
    await until(alpha, area, Approvals, (state) => state.approval === "Waiting" && state.sheet);
    expect(document.querySelector('[aria-label="Workflow approval"]')?.textContent).toContain("Review the statement preview");
    world.workflows.approvalTitle = "Review the revised statement preview";
    await press("Approve");
    await until(alpha, area, Approvals, (state) => state.approval === "NotApplied");
    expect(world.workflows.decisions).toEqual([]);

    await later(alpha, 4_000);
    await until(alpha, area, Approvals, (state) => state.approval === "Waiting" && state.sheet);
    expect(document.querySelector('[aria-label="Workflow approval"]')?.textContent).toContain("Review the revised statement preview");
    await press("Approve");
    await until(alpha, area, Approvals, (state) => state.approval === "Approved");
    expect(world.workflows.decisions).toEqual([{ version: "monthly-statement-v3", digest: "a".repeat(64), approved: true }]);

    await later(alpha, 4_000);
    await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.status === "Done");
    expect(document.querySelector('[aria-label="Run details"]')?.textContent).toContain("Your statement is ready.");
    await drawn(() => {
      const details = document.querySelector<HTMLDetailsElement>('details[aria-label="Workflow execution details"]');
      const reveal = details?.querySelector("summary");
      if (!details || !reveal) throw new Error("No execution details");
      reveal.click();
      expect({
        open: details.open,
        activity: [...details.querySelectorAll("time")].map((time) => ({
          at: time.dateTime, node: time.parentElement?.querySelector("span")?.textContent,
        })),
      }).toEqual({
        open: true,
        activity: [{ at: "2026-11-24T07:02:00.000Z", node: undefined }, { at: "2026-11-24T07:01:00.000Z", node: "preview" }],
      });
    });
  });
});
