// @vitest-environment happy-dom
import { Effect, Layer, Option } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as StartupGen from "../gen/app__startup.ts";
import { Machine as Startup } from "../gen/app__startup.effect.vibe";
import * as AccessGen from "../gen/app__startup__access.ts";
import { Machine as Access } from "../gen/app__startup__access.effect.vibe";
import * as CallGen from "../gen/app__startup__call.ts";
import * as InstanceGen from "../gen/app__startup__instance.ts";
import { Machine as Instance } from "../gen/app__startup__instance.effect.vibe";
import * as JournalGen from "../gen/app__startup__journal.ts";
import { Machine as Journal } from "../gen/app__startup__journal.effect.vibe";
import * as RecoveryGen from "../gen/app__startup__recovery.ts";
import { Machine as Recovery } from "../gen/app__startup__recovery.effect.vibe";
import { App } from "../src/App.tsx";
import { at } from "../src/areas.ts";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";
import { untimed } from "../src/runtime/reactor.vibe";
import startupArea, {
  AccessDesk,
  InstanceDesk,
  RecoveryDesk,
  StartupDesk,
  StartupJournalView,
  StartupOverlay,
  answerHandOff,
  beginWalkthrough,
  clearJournal,
  closeAssistant,
  exitMockMode,
  harvestExit,
  markPageDrawn,
  ownerGone,
  ownerToFront,
  pruneJournal,
  recordFailure,
  reportFinishTrouble,
  reportPageFailure,
  reportPageLost,
  reportUnbuildable,
  requestReload,
  requestReloadAnyway,
  requestSwitchHome,
  resolveConnection,
  retryAgentConnection,
  startInstance,
  summonAssistant,
  takeAssistantCall,
  welcomeOwner,
} from "../src/startup/index.tsx";
import { reloadBeforeMount } from "../src/startup/recovery.vibe";
import { button, closeAll, drawn, later, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

const react = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

const startupMounts = () => [
  ...only("home", "notice"),
  at("overlay", () => Promise.resolve({ default: startupArea })),
];

describe("startup", () => {
  afterEach(closeAll);

  it("Shows recovery before the shell opens (spec/app/startup/recovery.md, \"Story: See that something went wrong, and get out of it\")", async () => {
    const unavailable = Layer.effectContext<Platform, never, never>(Effect.die("unavailable startup service"));
    const alpha = boot(unavailable, []);
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
    const previous = react.IS_REACT_ACT_ENVIRONMENT;
    react.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () => {
        root.render(<App alpha={alpha} />);
        await alpha.runtime.runPromiseExit(Effect.void);
      });
      // spec/app/startup/recovery.md, "The failure screen stays until the owner's Reload rebuilds the page or its process dies, and a page without WebView stays as it is"
      const dialog = host.querySelector('[role="alertdialog"]');
      const reloadBtn = [...(dialog?.querySelectorAll("button") ?? [])].find((one) => one.textContent === "Reload");
      expect([dialog?.textContent?.includes("Something went wrong"), reloadBtn?.disabled, reload.mock.calls.length]).toEqual([true, false, 0]);
      act(() => reloadBtn?.click());
      expect(reload.mock.calls).toHaveLength(1);
    } finally {
      reload.mockRestore();
      act(() => root.unmount());
      react.IS_REACT_ACT_ENVIRONMENT = previous;
      await alpha.dispose();
      host.remove();
    }
  });

  // spec/app/startup/index.md, "Story: Start in mock mode only in a test build"; spec/app/startup/index.md, "Story: Wait for the agent"
  it("Admits mock mode only in a test build, waits for the agent with timeout, and retries with backoff (spec/app/startup/index.md, \"Story: Start in mock mode only in a test build\"; spec/app/startup/index.md, \"Story: Wait for the agent\")", async () => {
    underAct();
    // spec/app/startup/index.md, "Mock mode and fixtures are admitted only in a test build"
    const prodBoot = StartupGen.start(StartupGen.initial, true, false, true, true, 0).state;
    expect([prodBoot.mock, prodBoot.fixtures, StartupGen.shows(prodBoot, "MockBanner")]).toEqual(["NoMock", false, false]);

    // spec/app/startup/index.md, "Mock mode shows its banner on every surface, and Exit mock mode leaves it"
    const testBoot = StartupGen.start(StartupGen.initial, false, true, true, true, 0).state;
    expect([testBoot.mock, testBoot.fixtures, StartupGen.shows(testBoot, "MockBanner")]).toEqual(["Mocking", true, true]);
    const leftMock = StartupGen.exitMock(testBoot);
    expect([leftMock.mock, StartupGen.shows(leftMock, "MockBanner")]).toEqual(["LeftMock", false]);

    // spec/app/startup/index.md, "A connection that has not resolved thirty seconds after start counts as unreachable"
    const world = scene();
    const { alpha } = await open(world, startupMounts());
    const runtime = startupArea.runtime(alpha);
    await runtime.runPromise(Effect.flatMap(StartupDesk, (desk) => Effect.sync(() => {
      desk.setHooks({
        testBuild: true,
        mockAsked: true,
        checkAgent: () => Effect.succeed("Connected" as const),
      });
    })));
    await until(alpha, runtime, Startup, (s) => s.known && s.connection === "Connected");

    // spec/app/startup/index.md, "A connection that has not resolved thirty seconds after start counts as unreachable"
    const pendingState = StartupGen.learn(
      StartupGen.start(StartupGen.initial, false, false, false, false, 1000).state,
      1,
      false,
      false,
      false,
      false,
      false,
      "en-US",
      "ByLocale",
    ).state;
    expect([StartupGen.shows(pendingState, "Mark"), StartupGen.shows(pendingState, "Home"), StartupGen.canTimedOut(pendingState, 30999), StartupGen.canTimedOut(pendingState, 31000)])
      .toEqual([true, false, false, true]);
    const timedOutState = StartupGen.timedOut(pendingState, 31000);
    expect([timedOutState.connection, StartupGen.shows(timedOutState, "Mark"), StartupGen.shows(timedOutState, "Home")]).toEqual(["Unreachable", false, true]);

    const retryPromise = runtime.runPromise(retryAgentConnection());
    await later(alpha, 1000);
    expect(await retryPromise).toBe("Connected");
    const snap = await runtime.runPromise(Effect.flatMap(StartupDesk, (desk) => Effect.sync(() => desk.snapshot())));
    expect([snap.retryCount, snap.retryBackoffMs, snap.agentHealthy]).toEqual([1, 1000, true]);
    expect(await runtime.runPromise(exitMockMode())).toBe(false);
    expect(typeof reloadBeforeMount).toBe("function");
  });

  // spec/app/startup/access.md, "Story: Walk through each access in order"; spec/app/startup/access.md, "Story: Hear that all is set"
  it("Walks permissions in fixed order, saves progress, supports skip and All set completion (spec/app/startup/access.md, \"Story: Walk through each access in order\"; spec/app/startup/access.md, \"Story: Hear that all is set\")", async () => {
    underAct();
    const world = scene();
    const { alpha } = await open(world, startupMounts());
    const runtime = startupArea.runtime(alpha);

    const grants: Record<string, { grant: "Denied" | "Granted"; on: boolean; requestable: boolean }> = {
      Notifications: { grant: "Denied", on: true, requestable: true },
      Microphone: { grant: "Granted", on: true, requestable: false },
      Camera: { grant: "Denied", on: true, requestable: false },
      Location: { grant: "Granted", on: true, requestable: false },
    };

    await runtime.runPromise(Effect.flatMap(AccessDesk, (desk) => Effect.sync(() => {
      desk.setHooks({
        check: (key) => Effect.succeed(Option.fromNullishOr(grants[key])),
        ask: (key) => Effect.sync(() => {
          grants[key] = { grant: "Granted", on: true, requestable: false };
          return Option.some(grants[key]);
        }),
        save: () => Effect.succeed(true),
      });
    })));

    await drawn(() => runtime.runPromise(beginWalkthrough(false, false)));
    await until(alpha, runtime, Access, (s) => s.known.includes("Notifications") && s.known.includes("Location"));
    await drawn(() => runtime.runPromise(welcomeOwner(true)));
    await until(alpha, runtime, Access, (s) => AccessGen.panel(s) === "Walkthrough" && AccessGen.nextKey(s) === "Notifications");

    expect(document.body.textContent).toContain("Step 1 of 4");
    await press("Allow");
    await until(alpha, runtime, Access, (s) => AccessGen.flow(s, "Notifications") === "Ready");
    await press("Continue");
    await until(alpha, runtime, Access, (s) => AccessGen.nextKey(s) === "Microphone");

    await press("Continue");
    await until(alpha, runtime, Access, (s) => AccessGen.nextKey(s) === "Camera");

    await press("Skip");
    await until(alpha, runtime, Access, (s) => AccessGen.nextKey(s) === "Location");

    await press("Continue");
    await until(alpha, runtime, Access, (s) => AccessGen.panel(s) === "AllSet");
    expect(document.body.textContent).toContain("All set");

    await press("Done");
    await until(alpha, runtime, Access, (s) => AccessGen.panel(s) === "Hidden" && AccessGen.completed(s));
    const finalAccess = await runtime.runPromise(Effect.flatMap(Access, (m) => m.get()));
    expect([AccessGen.choiceOf(finalAccess, "Notifications"), AccessGen.choiceOf(finalAccess, "Microphone"), AccessGen.choiceOf(finalAccess, "Camera"), AccessGen.choiceOf(finalAccess, "Location")])
      .toEqual(["Allowed", "Continued", "Skipped", "Continued"]);

    // spec/app/startup/access.md, "Story: Hear that all is set"
    await drawn(() => runtime.runPromise(beginWalkthrough(false, false)));
    await drawn(() => runtime.runPromise(welcomeOwner(false)));
    expect(await runtime.runPromise(reportFinishTrouble("ConnectionFailed"))).toBe(true);
    await until(alpha, runtime, Access, (s) => AccessGen.panel(s) === "AllSet" && s.finish.trouble === "ConnectionFailed");
    expect(document.body.textContent).toContain("Connection failed");
  });

  // spec/app/startup/recovery.md, "Story: See that something went wrong, and get out of it"; spec/app/startup/recovery.md, "Story: Keep my drafts through a rebuild"; spec/app/startup/recovery.md, "Story: Come back after the page is lost"
  it("Recovers HomeSide and AssistantSide with draft flush, Reload anyway escape hatch, Switch Home fallback, and loss budget (spec/app/startup/recovery.md, \"Story: See that something went wrong, and get out of it\"; spec/app/startup/recovery.md, \"Story: Keep my drafts through a rebuild\"; spec/app/startup/recovery.md, \"Story: Come back after the page is lost\")", async () => {
    underAct();
    const world = scene();
    const { alpha } = await open(world, startupMounts());
    const runtime = startupArea.runtime(alpha);

    await runtime.runPromise(markPageDrawn("HomeSide"));
    await runtime.runPromise(markPageDrawn("AssistantSide"));

    // spec/app/startup/recovery.md, "Reload first asks every area holding a draft on that surface to put it on the phone, and rebuilds when they have"
    let flushAnswer: Option.Option<boolean> = Option.some(false);
    await runtime.runPromise(Effect.flatMap(RecoveryDesk, (desk) => Effect.sync(() => {
      desk.setHooks({
        flushDrafts: () => Effect.succeed(flushAnswer),
        switchHome: (route) => Effect.succeed(route === "AndroidSettings"),
      });
    })));

    await drawn(() => runtime.runPromise(reportPageFailure("HomeSide", "FailedToDraw")));
    await until(alpha, runtime, Recovery, (s) => s.home.page === "Broken");
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Something went wrong");

    // spec/app/startup/actor.md, "The owner or the agent sends each event, and only the owner answers"
    expect(await runtime.runPromise(requestReload("HomeSide", "Agent"))).toBe(false);

    // spec/app/startup/recovery.md, "When the drafts could not be written, or five seconds pass unanswered, the screen says unsaved edits would be lost, and only the owner's Reload anyway rebuilds over them"
    await drawn(() => runtime.runPromise(requestReload("HomeSide", "Owner")));
    await until(alpha, runtime, Recovery, (s) => s.home.flush.status === "Failed");
    expect(document.body.textContent).toContain("Unsaved edits would be lost");
    expect(Boolean(button("Reload anyway"))).toBe(true);

    // spec/app/startup/recovery.md, "Switch Home opens Android's choice of Home, then its default apps, then its Settings, from the failure screen or a phone without WebView, only where Alpha is Home"
    expect(await runtime.runPromise(requestSwitchHome(true, "Owner"))).toBe(true);
    await until(alpha, runtime, Recovery, (s) => s.switch.status === "Loaded" && s.route === "AndroidSettings");
    const attempts = await runtime.runPromise(Effect.flatMap(RecoveryDesk, (desk) => Effect.sync(() => [...desk.switchAttempts])));
    expect(attempts).toEqual(["Chooser", "DefaultApps", "AndroidSettings"]);

    // spec/app/startup/recovery.md, "The failure screen stays until the owner's Reload rebuilds the page or its process dies, and a page without WebView stays as it is"
    expect(await runtime.runPromise(requestReloadAnyway("HomeSide", "Agent"))).toBe(false);
    await drawn(() => runtime.runPromise(requestReloadAnyway("HomeSide", "Owner")));
    await until(alpha, runtime, Recovery, (s) => s.home.page === "Starting" && s.home.number === 2);

    // spec/app/startup/recovery.md, "Reload first asks every area holding a draft on that surface to put it on the phone, and rebuilds when they have"
    flushAnswer = Option.some(true);
    await runtime.runPromise(markPageDrawn("HomeSide"));
    await drawn(() => runtime.runPromise(reportPageFailure("HomeSide", "FailedToDraw")));
    await until(alpha, runtime, Recovery, (s) => s.home.page === "Broken");
    await drawn(() => runtime.runPromise(requestReload("HomeSide", "Owner")));
    await until(alpha, runtime, Recovery, (s) => s.home.page === "Starting" && s.home.number === 3);

    // spec/app/startup/recovery.md, "Within the budget a lost page is rebuilt at once, at most three times a minute; past it, the owner chooses on Android's Home and elsewhere Alpha waits five seconds"
    await runtime.runPromise(reportPageLost("AssistantSide", true, 1, true));
    await until(alpha, runtime, Recovery, (s) => s.assistant.number === 2);
    await runtime.runPromise(reportPageLost("AssistantSide", true, 2, true));
    await until(alpha, runtime, Recovery, (s) => s.assistant.number === 3);
    await runtime.runPromise(reportPageLost("AssistantSide", true, 3, true));
    await until(alpha, runtime, Recovery, (s) => s.assistant.number === 4 && s.quick === 3);
    await runtime.runPromise(reportPageLost("AssistantSide", true, 4, true));
    await until(alpha, runtime, Recovery, (s) => s.assistant.page === "Rebuilding" && s.assistant.wait === "Backoff");
    await later(alpha, 5000);
    await until(alpha, runtime, Recovery, (s) => s.assistant.number === 5 && s.assistant.page === "Starting");

    // spec/app/startup/recovery.md, "A phone without Android's WebView says so, is recorded, and is never rebuilt"
    await drawn(() => runtime.runPromise(reportUnbuildable("AssistantSide")));
    await until(alpha, runtime, Recovery, (s) => s.assistant.page === "Unbuildable");
    expect(RecoveryGen.canReload(await runtime.runPromise(Effect.flatMap(Recovery, (m) => m.get())), "AssistantSide", "Owner", 99999)).toBe(false);
    expect(typeof StartupOverlay).toBe("function");
  });

  // spec/app/startup/instance.md, "Story: Stay one Home"; spec/app/startup/call.md, "Story: Listen only when I just asked for it"; spec/app/startup/journal.md, "Story: Remember what went wrong"
  it("Enforces single-Home instance handoff, assistant call gating, and 50-entry 30-day journal pruning (spec/app/startup/instance.md, \"Story: Stay one Home\"; spec/app/startup/call.md, \"Story: Listen only when I just asked for it\"; spec/app/startup/journal.md, \"Story: Remember what went wrong\")", async () => {
    underAct();
    const world = scene();
    const { alpha } = await open(world, [at("overlay", () => Promise.resolve({ default: startupArea }))]);
    const runtime = startupArea.runtime(alpha);

    // spec/app/startup/instance.md, "A start reaches the page in its task, builds the first page, or hands itself to the owner"
    await runtime.runPromise(Effect.flatMap(InstanceDesk, (desk) => Effect.sync(() => {
      desk.setHooks({ handOff: () => Effect.succeed(true) });
    })));
    await runtime.runPromise(startInstance(true));
    await until(alpha, runtime, Instance, (s) => s.owner === "InHome" && s.homePage);
    await runtime.runPromise(startInstance(false));
    await until(alpha, runtime, Instance, (s) => s.unanswered === 1 && s.trusted);
    await runtime.runPromise(startInstance(false));
    await until(alpha, runtime, Instance, (s) => s.unanswered === 2 && s.trusted);
    await runtime.runPromise(startInstance(false));
    await until(alpha, runtime, Instance, (s) => !s.trusted && s.ordinaryPage && s.owner === "InOrdinary");
    await runtime.runPromise(ownerToFront());
    await until(alpha, runtime, Instance, (s) => s.unanswered === 0);
    await runtime.runPromise(ownerGone());
    await until(alpha, runtime, Instance, (s) => s.owner === "InHome" && !s.ordinaryPage);
    expect(InstanceGen.maxUnanswered).toBe(3);
    expect(await runtime.runPromise(answerHandOff(999, true))).toBe(false);

    // spec/app/startup/call.md, "A call listens only from the wake word or the power button, from a trusted caller on an Alpha image, unlocked, under the same account, and soon enough"
    const wakeWarm = CallGen.note("WakeWord", true, false, false, 1000, 1);
    const powerCold = CallGen.note("PowerButton", true, false, true, 1000, 1);
    const gesture = CallGen.note("Gesture", true, false, false, 1000, 1);
    const tile = CallGen.note("Tile", true, false, false, 1000, 1);
    const untrusted = CallGen.note("WakeWord", false, false, false, 1000, 1);
    const locked = CallGen.note("WakeWord", true, true, false, 1000, 1);
    expect([
      CallGen.listens(wakeWarm, true, 1, 5500),
      CallGen.listens(wakeWarm, true, 1, 6001),
      CallGen.listens(powerCold, true, 1, 15500),
      CallGen.listens(powerCold, true, 1, 16001),
      CallGen.listens(wakeWarm, false, 1, 2000),
      CallGen.listens(wakeWarm, true, 2, 2000),
      CallGen.listens(gesture, true, 1, 2000),
      CallGen.listens(tile, true, 1, 2000),
      CallGen.listens(untrusted, true, 1, 2000),
      CallGen.listens(locked, true, 1, 2000),
    ]).toEqual([true, false, true, false, false, false, false, false, false, false]);

    // spec/app/startup/index.md, "A call is taken once Home takes input, and raises Ask Alpha listening only as Call says"
    const assistantBoot = StartupGen.learn(
      StartupGen.start(StartupGen.initial, true, false, false, false, 0).state,
      1,
      true,
      true,
      true,
      false,
      false,
      "en-US",
      "ByLocale",
    ).state;
    const summoned = StartupGen.summon(assistantBoot, "WakeWord", true, false, false, 1000, 1);
    const resolved = StartupGen.resolve(summoned, "Connected");
    const taken = StartupGen.take(resolved, false, 1, 2000);
    expect(taken.out).toEqual([{ tag: "Raise", origin: "WakeWord", listening: true, cold: false }]);
    expect(StartupGen.leave(taken.state).out).toEqual([{ tag: "CloseSurface" }]);
    expect(typeof summonAssistant).toBe("function");
    expect(typeof takeAssistantCall).toBe("function");
    expect(typeof closeAssistant).toBe("function");
    expect(typeof resolveConnection).toBe("function");

    // spec/app/startup/journal.md, "A new entry pushes out the oldest once fifty are held"; spec/app/startup/journal.md, "At each start the journal drops what is older than thirty days, or dated further ahead than that"
    await runtime.runPromise(clearJournal(true));
    for (let i = 0; i < 55; i += 1) {
      await runtime.runPromise(recordFailure("FailedToDraw"));
    }
    const after55 = await runtime.runPromise(Effect.flatMap(Journal, (m) => m.get()));
    expect(after55.entries.length).toBe(JournalGen.capacity);

    await runtime.runPromise(harvestExit(1, "Crashed", 1000));
    expect(await runtime.runPromise(harvestExit(1, "Crashed", 2000))).toBe(false);

    // spec/app/startup/journal.md, "Only a development build shows the journal"
    expect(JournalGen.visible(after55, false)).toHaveLength(0);
    expect(JournalGen.visible(after55, true)).toHaveLength(JournalGen.capacity);

    await later(alpha, JournalGen.retention + 10_000);
    await runtime.runPromise(recordFailure("Uncaught"));
    await runtime.runPromise(pruneJournal());
    const afterPrune = await runtime.runPromise(Effect.flatMap(Journal, (m) => m.get()));
    expect([afterPrune.entries.length, afterPrune.dropped > 0]).toEqual([1, true]);

    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    await drawn(() => root.render(<StartupJournalView runtime={runtime} testBuild />));
    expect(host.textContent).toContain("Uncaught error");
    await drawn(() => {
      const clearBtn = [...host.querySelectorAll("button")].find((b) => b.textContent === "Clear");
      clearBtn?.click();
    });
    await until(alpha, runtime, Journal, (s) => s.entries.length === 0);
    await drawn(() => root.unmount());
    host.remove();
    expect(untimed).toBe(0);
  }, 180_000);
});
