// @vitest-environment happy-dom
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Machine as Listing } from "../gen/app__workflows__list.effect.vibe";
import { Machine as Definition } from "../gen/app__workflows.effect.vibe";
import { Machine as Automations } from "../gen/app__workflows__automations.effect.vibe";
import { Machine as Runs } from "../gen/app__workflows__runs.effect.vibe";
import { Machine as Sheet } from "../gen/app__workflows__sheet.effect.vibe";
import { Machine as Clock } from "../gen/app__workflows__clock.effect.vibe";
import { Machine as Approvals } from "../gen/app__workflows__approvals.effect.vibe";
import { Machine as Builder } from "../gen/app__workflows__builder.effect.vibe";
import workflows from "../src/workflows/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import home from "../src/home/index.tsx";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { button, closeAll, drawn, fill, later, only, open, press, pressOnTop, seen, typeInto, underAct, until } from "./alpha.tsx";
import { memoryIndexedDB } from "./fakes/indexeddb.ts";
import { type Scene, scene } from "./fakes/scene.ts";
import { nativeApprovalNotices, workflowNoteOffer, workflowPhoneOffer } from "./fakes/workflows.ts";

underAct();
afterEach(closeAll);

const rows = () => [...document.querySelectorAll("ul[aria-label=Workflows] li > button")];
const visible = (...names: string[]) => names.filter((name) => rows().some((row) => row.textContent?.startsWith(name)));
const choose = (name: string) => drawn(() => {
  const row = rows().find((one) => one.textContent?.startsWith(name));
  if (!(row instanceof HTMLButtonElement)) throw new Error(`No workflow named ${name}`);
  row.click();
});

/** Open the workflow actions disclosure and choose its visible action. */
const pressWorkflowAction = (name: string) => drawn(() => {
  const opener = document.querySelector<HTMLElement>("summary[aria-label='Workflow actions']");
  const menu = opener?.parentElement;
  if (opener === null || !(menu instanceof HTMLDetailsElement)) throw new Error("no workflow actions disclosure");
  expect(menu.open).toBe(false);
  opener.click();
  expect(menu.open).toBe(true);
  const action = [...menu.querySelectorAll("button")].find((one) => one.textContent === name);
  if (action === undefined) throw new Error(`no workflow action ${name}`);
  action.click();
});

/** Press a button inside the open workflow change review. */
const pressInReview = (name: string) => drawn(() => {
  const found = [...document.querySelectorAll("[aria-label='Review workflow change'] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no button ${name} in the review`);
  found.click();
});
/** Type into the field a visible label wraps, as the builder's Name and Text are drawn. */
const write = (name: string, text: string) => drawn(() => {
  const label = [...document.querySelectorAll("label")].find((one) => one.firstChild?.textContent?.trim() === name);
  const found = label?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (!found) throw new Error(`no field ${name}`);
  typeInto(found, text);
});

async function openWorkflows(world: Scene, withAssistant = false) {
  const mounts = only("home", "view:Workflows", "notice", ...(withAssistant ? ["assistant" as const] : []));
  const { alpha } = await open(world, mounts);
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

/** Open Workflows on `world`, with Ask Alpha where `assistant` holds, and wait for its list: every page of it where `complete` holds. */
async function onList(world: Scene, { assistant = false, complete = false } = {}) {
  const alpha = await openWorkflows(world, assistant);
  const area = workflows.runtime(alpha);
  await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && (!complete || state.complete));
  return { alpha, area };
}

/** Run the Monthly statement now from its page, and wait for the run in its history. */
async function runStatement(world: Scene) {
  const { alpha, area } = await onList(world, { assistant: true });
  await choose("Monthly statement");
  await until(alpha, area, Definition, (state) => state.detail.status === "Loaded");
  await until(alpha, area, Runs, (state) => state.reading.status === "Loaded");
  await press("Run now");
  await press("Confirm run");
  await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.shown === 1);
  return { alpha, area };
}

/** Open the newest run in the run history. */
const openRun = () => drawn(() => {
  const row = document.querySelector<HTMLButtonElement>('[aria-label="Run history"] li > button');
  if (!row) throw new Error("No run history");
  row.click();
});

/** Leave the open run and its workflow for the list. */
async function backToList(alpha: Alpha, area: ReturnType<typeof workflows.runtime>) {
  await drawn(() => alpha.back());
  await until(alpha, area, Sheet, (state) => state.runId === 0);
  await drawn(() => alpha.back());
  await until(alpha, area, Listing, (state) => state.place.tag === "ListingRows");
}

describe("Workflows", () => {
  it('Filters the owner’s work and keeps removed history (spec/app/workflows/list.md, "Story: Find a workflow")', async () => {
    const world = scene();
    const { alpha, area } = await onList(world, { complete: true });
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
    const { alpha, area } = await onList(world);

    await press("Add to Workflows");
    const opener = button("Clock alarms");
    expect(opener?.textContent).toBe("Alarm");
    await press("Clock alarms");
    await until(alpha, area, Clock, (state) => state.open && state.history.status === "Loaded");

    const alarm = document.querySelector('[role="dialog"][aria-label="Clock alarms"]');
    expect(opener?.closest("[inert]")).not.toBeNull();
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
    const { alpha, area } = await onList(world, { complete: true });
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
    const { alpha, area } = await onList(world, { complete: true });

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

  it('Runs the reviewed version, follows its approval and opens its output (spec/app/workflows/runs.md, "Story: Run a workflow now"; spec/app/workflows/sheet.md, "Story: Read a run\'s sheet"; spec/app/workflows/approvals.md, "Story: Answer a run\'s approval on the phone"; spec/app/workflows/approvals.md, "Story: Confirm exactly what this workflow does on my phone"; spec/app/workflows/approvals.md, "Story: Open the run a notice names"; spec/app/workflows/sheet.md, "Story: Open a finished workflow from its notification")', async () => {
    // spec/app/assistant/index.md, "Stored attachments are posted with their message, and a message whose attachments could not be stored never left": the WebView's IndexedDB keeps the run attached to Ask Alpha.
    vi.stubGlobal("indexedDB", memoryIndexedDB());
    onTestFinished(() => { vi.unstubAllGlobals(); });
    const world = scene();
    world.phone = true;
    world.image = true;
    world.ask.spokenFiles = [];
    const device = await workflowNoteOffer(world.workflows, world.notes.owner);
    world.telephony.textReview = device;
    const notices = nativeApprovalNotices();
    world.workflows.nativeNotices = notices;
    world.workflows.stage = "Running";
    const { alpha, area } = await runStatement(world);
    expect(world.workflows.admissions).toHaveLength(1);
    expect(world.workflows.admissions[0]?.version).toBe("monthly-statement-v3");
    await openRun();
    await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.status === "Running");
    await seen(false);
    const reads = world.workflows.receiptReads;
    world.workflows.stage = "Waiting";
    await later(alpha, 8_000);
    expect(world.workflows.receiptReads).toBe(reads);
    expect(notices.posted).toEqual([]);
    await backToList(alpha, area);

    await seen(true);
    await vi.waitFor(() => expect(notices.posted).toHaveLength(1));
    const first = notices.posted[0];
    if (first === undefined) throw new Error("The phone received no approval notice");
    expect(first.route).toMatchObject({ workflowId: "monthly-statement", runId: "monthly-statement-r1", versionId: "monthly-statement-v3" });
    expect(Object.keys(first).sort()).toEqual(["bindingHash", "expiresAt", "id", "route"]);
    expect(first.route.scope).toMatch(/^[a-f0-9]{64}$/);
    await drawn(() => notices.tap(first));
    await until(alpha, area, Approvals, (state) => state.opened === "Ready" && state.sheet);
    expect(document.querySelector('[aria-label="Workflow approval"]')?.textContent).toContain("Review the statement preview");
    await vi.waitFor(() => expect(notices.consumed).toEqual(["tap-1"]));
    expect(world.workflows.decisions).toEqual([]);
    world.workflows.approvalTitle = "Review the revised statement preview";
    await press("Approve");
    await until(alpha, area, Approvals, (state) => state.approval === "NotApplied");
    expect(world.workflows.decisions).toEqual([]);

    await later(alpha, 4_000);
    await until(alpha, area, Approvals, (state) => state.approval === "Waiting" && state.sheet);
    expect(document.querySelector('[aria-label="Workflow approval"]')?.textContent).toContain("Review the revised statement preview");
    await press("Approve");
    await vi.waitFor(() => expect(world.workflows.stage).toBe("Device"));
    expect(world.workflows.decisions).toEqual([{ version: "monthly-statement-v3", digest: "a".repeat(64), approved: true }]);
    expect(world.notes.creations.size).toBe(0);
    await later(alpha, 4_000);
    await until(alpha, area, Approvals, (state) => state.device.phase === "DeviceShown");
    expect(document.querySelector('[aria-label="Review device action"]')?.textContent).toContain("Statement saved by Workflows");
    await press("Approve device action");
    await until(alpha, area, Approvals, (state) => state.device.phase === "DeviceAnswered");
    await until(alpha, area, Approvals, (state) => state.approval === "Approved");
    expect({ notes: world.notes.notes.filter(({ title }) => title === "Statement saved by Workflows"), claims: device.claims, sent: device.receipts }).toMatchObject({
      notes: [{ title: "Statement saved by Workflows" }], claims: [device.proposal.id],
      sent: [{ outcome: "applied", operationId: device.proposal.id }],
    });
    world.workflows.stage = "Done";

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

    await backToList(alpha, area);
    await later(alpha, 60_000);
    await vi.waitFor(() => expect(notices.results).toHaveLength(1));
    const result = notices.results[0];
    if (result === undefined) throw new Error("No Workflow result notice");
    expect(result.route).toMatchObject({ workflowId: "monthly-statement", runId: "monthly-statement-r1", versionId: "monthly-statement-v3" });
    await drawn(() => notices.tapResult(result));
    await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.status === "Done");
    expect(document.querySelector('[aria-label="Run details"]')?.textContent).toContain("Your statement is ready.");
    await vi.waitFor(() => expect(notices.consumed).toEqual(["tap-1", "tap-result"]));
    expect(button("Remove Workflow run.json")).toBeUndefined();

    await backToList(alpha, area);
    await drawn(() => notices.tapResult(result, true));
    await vi.waitFor(() => expect(button("Remove Workflow run.json")).toBeDefined(), { timeout: 10_000 });
    expect(notices.consumed).toEqual(["tap-1", "tap-result", "tap-result-question"]);
    expect(world.ask.said).toEqual([]);

    await fill("Message Alpha", "What happened in this run?");
    await vi.waitFor(() => expect(button("Send")?.disabled).toBe(false));
    await press("Send");
    await vi.waitFor(() => expect(world.ask.said).toEqual(["What happened in this run?"]), { timeout: 12_000 });
    const attachment = world.ask.spokenFiles?.at(-1)?.images?.[0] as { readonly name?: string; readonly mimeType?: string; readonly data?: string } | undefined;
    expect(attachment).toMatchObject({ name: "Workflow run.json", mimeType: "application/json" });
    expect(JSON.parse(atob(attachment?.data ?? ""))).toMatchObject({
      workflowId: "monthly-statement", runId: "monthly-statement-r1", versionId: "monthly-statement-v3",
    });
  });

  it('Reads the exact run on Android and stops it when Alpha goes into the background (spec/app/workflows/sheet.md, "Story: Read a run’s sheet")', async () => {
    const world = scene();
    world.phone = true;
    world.voice.onDevice = true;
    let endPlayback: () => void = () => {};
    const playing = new Promise<void>((resolve) => { endPlayback = resolve; });
    world.voice.playbackHold = () => playing;
    world.workflows.run = true;
    try {
      const { alpha, area } = await onList(world, { assistant: true });
      await choose("Monthly statement");
      await until(alpha, area, Sheet, (state) => state.history.status === "Loaded" && state.shown > 0);
      await openRun();
      await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.status === "Done");
      const initialHushes = world.voice.hushCalls;
      await press("Read aloud");
      await vi.waitFor(() => expect(world.voice.played.map(({ text }) => text)).toContain("Your statement is ready."), { timeout: 15_000 });
      expect(world.voice.spoken).toContainEqual({ text: "Your statement is ready.", append: false, replace: false, channel: "local" });
      expect(button("Stop reading")).toBeDefined();
      await seen(false);
      await until(alpha, area, Sheet, (state) => state.speech.outcome !== "Sent");
      await vi.waitFor(() => expect(world.voice.hushCalls).toBeGreaterThan(initialHushes));
      expect(world.voice.startCloudSpeechCalls).toBe(0);
    } finally {
      endPlayback();
    }
  });

  it.each(["post_notification", "speak_text", "speak_text_stopped"] as const)('Presents a reviewed workflow step on Android (%s) (spec/app/workflows/approvals.md, "Story: Confirm exactly what this workflow does on my phone")', async (scenario) => {
    const kind = scenario === "speak_text_stopped" ? "speak_text" : scenario;
    const world = scene();
    world.phone = true;
    world.image = true;
    const proposal = await workflowPhoneOffer(world.workflows, world.notes.owner, kind);
    world.telephony.textReview = proposal;
    if (scenario === "speak_text_stopped") world.voice.playbackHold = () => new Promise<void>(() => {});
    const notices = nativeApprovalNotices();
    world.workflows.nativeNotices = notices;
    world.workflows.stage = "Device";
    const { alpha, area } = await runStatement(world);
    await openRun();
    await until(alpha, area, Approvals, (state) => state.device.phase === "DeviceShown");
    expect(document.querySelector('[aria-label="Review device action"]')?.textContent).toContain("A reviewed note.");
    expect(proposal.receipts).toEqual([]);
    await press("Approve device action");
    if (scenario === "speak_text_stopped") {
      await vi.waitFor(() => expect(world.voice.played).toHaveLength(1), { timeout: 15_000 });
      const hushes = world.voice.hushCalls;
      await press("Stop reading");
      await until(alpha, area, Approvals, (state) => state.device.phase === "DeviceUnconfirmed");
      await vi.waitFor(() => expect(world.voice.hushCalls).toBeGreaterThan(hushes));
      expect(proposal.receipts).not.toContainEqual(expect.objectContaining({ outcome: "applied" }));
      return;
    }
    await until(alpha, area, Approvals, (state) => state.device.phase === "DeviceAnswered");
    expect(proposal.receipts).toMatchObject([{ outcome: "applied", operationId: proposal.proposal.id }]);
    if (kind === "speak_text") {
      expect(world.voice.played).toHaveLength(1);
    } else {
      expect(notices.results).toMatchObject([{
        operationId: expect.stringMatching(/^step-[a-f0-9]{64}$/),
        title: "A reviewed notification", body: "A reviewed note.",
        route: { workflowId: "monthly-statement", runId: "monthly-statement-r1", versionId: "monthly-statement-v3" },
      }]);
      await backToList(alpha, area);
      const notice = notices.results[0];
      if (!notice) throw new Error("The step posted no notice");
      await drawn(() => notices.tapResult(notice));
      await until(alpha, area, Sheet, (state) => state.output.status === "Loaded" && state.runId > 0);
      await vi.waitFor(() => expect(notices.consumed).toEqual(["tap-result"]));
    }
  });

  it('Writes a workflow, reviews it and saves it on the agent once (spec/app/workflows/builder.md, "Story: Write a workflow step by step"; "Story: Save a workflow on the agent once")', async () => {
    const world = scene();
    const { alpha, area } = await onList(world);
    await press("Add to Workflows");
    await until(alpha, area, Listing, (state) => state.place.tag === "ListingAdd");
    await press("More options");
    await press(/^Steps/);
    await until(alpha, area, Builder, (state) => state.offer.status === "Loaded");

    await write("Name", "Water the plants");
    await write("Text", "Water the plants by the window.");
    await press("Add step");
    await until(alpha, area, Builder, (state) => state.steps.length === 1 && state.name > 0 && state.draft.sync === "Kept");
    await press("Review workflow");
    expect(document.querySelector("[role=alertdialog]")?.textContent).toContain("Runs only when you start it. It starts turned off.");
    await pressOnTop("Cancel");
    await until(alpha, area, Builder, (state) => !state.review.showing);
    expect(world.workflows.created).toEqual([]);

    await press("Review workflow");
    await pressOnTop("Save workflow");
    await until(alpha, area, Builder, (state) => state.saved === 1);
    expect(world.workflows.created.map((one) => ({ name: one.name, active: one.active }))).toEqual([{ name: "Water the plants", active: false }]);
    expect(world.workflows.saves.size).toBe(1);

    await drawn(() => alpha.back());
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded" && state.place.tag === "ListingRows");
    await vi.waitFor(async () => {
      await drawn(() => undefined);
      expect(visible("Monthly statement", "Water the plants")).toEqual(["Monthly statement", "Water the plants"]);
    }, { timeout: 15_000 });
  });

  it('Removes a workflow only after its review, keeps its history, and restores it (spec/app/workflows/index.md, "Story: Change a workflow")', async () => {
    const world = scene();
    const { alpha, area } = await onList(world);
    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded");
    await until(alpha, area, Sheet, (state) => state.history.status === "Loaded");

    await pressWorkflowAction("Remove workflow");
    expect(document.querySelector("[aria-label='Review workflow change']")?.textContent).toContain("Keeps history; stops future runs.");
    await pressInReview("Cancel");
    await until(alpha, area, Definition, (state) => !state.review.showing);
    expect(world.workflows.changes).toEqual([]);

    await pressWorkflowAction("Remove workflow");
    await pressInReview("Remove");
    await until(alpha, area, Definition, (state) => state.removed && state.detail.status === "Loaded" && !state.change.live);
    expect(world.workflows.changes).toEqual([{ operation: "remove", version: "monthly-statement-v3" }]);
    expect(button("Run now")).toBeUndefined();

    await drawn(() => alpha.back());
    await until(alpha, area, Listing, (state) => state.list.status === "Loaded");
    expect(visible("Monthly statement")).toEqual([]);
    await press("Filter workflows");
    await pressOnTop("Removed");
    await pressOnTop("Done");
    expect(visible("Monthly statement", "Retired brief")).toEqual(["Monthly statement", "Retired brief"]);

    await choose("Monthly statement");
    await until(alpha, area, Definition, (state) => state.detail.status === "Loaded" && state.removed);
    await pressWorkflowAction("Restore workflow");
    expect(document.querySelector("[aria-label='Review workflow change']")?.textContent).toContain("Restore paused; review before enabling.");
    await pressInReview("Confirm restore");
    await until(alpha, area, Definition, (state) => !state.removed && state.detail.status === "Loaded" && !state.change.live);
    expect(world.workflows.changes).toEqual([
      { operation: "remove", version: "monthly-statement-v3" },
      { operation: "restore", version: "monthly-statement-v4" },
    ]);
    expect(world.workflows.statement).toMatchObject({ removed: false, active: false });
  });
});
