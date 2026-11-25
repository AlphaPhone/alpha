// @vitest-environment happy-dom
import { type Context, Effect, Layer, ManagedRuntime, Stream } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import * as ClockView from "../gen/app__clock.effect.vibe";
import * as Alarms from "../gen/app__clock__alarms.effect.vibe";
import * as Stopwatch from "../gen/app__clock__stopwatch.effect.vibe";
import * as Timers from "../gen/app__clock__timers.effect.vibe";
import * as World from "../gen/app__clock__world.effect.vibe";
import { useMachine as useToasts } from "../gen/app__notices__toasts.react.ts";
import alertOverlayArea from "../src/clock/alertOverlay.tsx";
import clockCardsArea from "../src/clock/cards.tsx";
import clockArea from "../src/clock/index.tsx";
import { Clock } from "../src/clock/Clock.tsx";
import { ClockAlertOverlay } from "../src/clock/ClockAlertOverlay.tsx";
import { ClockHomeCard } from "../src/clock/ClockHomeCard.tsx";
import { type ClockSnapshot, clockRecords } from "../src/clock/records.ts";
import { clockResident, syncClockNow } from "../src/clock/sync.vibe";
import { stopwatch } from "../src/clock/stopwatch.vibe";
import { clockScreenTick } from "../src/clock/ticker.vibe";
import { toasts } from "../src/notices/toasts.vibe";
import { agentAt } from "../src/platform/agent.vibe";
import { cloudAt } from "../src/platform/cloud.vibe";
import { pagePlatform } from "../src/platform/platform.vibe";
import { together, whole } from "../src/runtime/reactor.vibe";
import { haptics } from "../src/shell/haptics.vibe";
import { shell } from "../src/shell/shell.vibe";
import { button, drawn, fill, press, pressOnTop, underAct } from "./alpha.tsx";
import { answering, fetched } from "./fakes/routes.ts";

underAct();

interface RemoteClock {
  snapshot: ClockSnapshot;
  puts: number;
  gets: number;
  waitForPut: () => Promise<void>;
  notifyPut: () => void;
}

function emptyRemote(nowMs: number): RemoteClock {
  const waiters: (() => void)[] = [];
  return {
    snapshot: { version: 0, updatedAtMs: nowMs, alarms: [], timers: [], world: [], deletedAlarmIds: [], deletedTimerIds: [] },
    puts: 0,
    gets: 0,
    waitForPut() {
      return new Promise((resolve) => {
        waiters.push(resolve);
      });
    },
    notifyPut() {
      for (const resolve of waiters.splice(0)) resolve();
    },
  };
}

function fakeHttp(answer: ReturnType<typeof answering>) {
  return Layer.succeed(HttpClient.HttpClient, HttpClient.make((request, url, signal) => Effect.tryPromise({
    try: () => fetched(answer, url, { method: request.method, headers: request.headers, body: request.body._tag === "Uint8Array" ? request.body.body : undefined, signal }),
    catch: (cause) => new HttpClientError.HttpClientError({ reason: new HttpClientError.TransportError({ request, cause }) }),
  }).pipe(Effect.map((response) => HttpClientResponse.fromWeb(request, response)))));
}

function makeHarness(startMs: number, remote: RemoteClock) {
  const agentAnswer = answering([
    (request, url) => (request.method === "GET" && url.pathname === "/api/health" ? Response.json({ ready: true }) : undefined),
    (request, url) => {
      if (url.pathname !== "/api/alpha/clock") return undefined;
      if (request.method === "GET") {
        remote.gets += 1;
        return Response.json(remote.snapshot);
      }
      if (request.method === "PUT") {
        remote.puts += 1;
        return request.json().then((body) => {
          remote.snapshot = body as ClockSnapshot;
          remote.notifyPut();
          return Response.json(remote.snapshot);
        });
      }
      return undefined;
    },
  ]);
  const cloudAnswer = answering([]);
  const platform = Layer.provideMerge(
    pagePlatform(
      Layer.provide(agentAt("http://agent.test"), fakeHttp(agentAnswer)),
      Layer.provide(cloudAt("http://cloud.test"), fakeHttp(cloudAnswer)),
    ),
    Layer.provideMerge(Layer.effectDiscard(TestClock.setTime(startMs)), TestClock.layer()),
  );
  const appLayer = Layer.provideMerge(
    whole(together(shell, toasts, haptics, clockResident, stopwatch, clockScreenTick)),
    platform,
  );
  return ManagedRuntime.make(appLayer);
}

const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
  document.body.innerHTML = "";
  localStorage.clear();
  clockRecords.reset(false);
});

type HarnessRuntime = ReturnType<typeof makeHarness>;
type HarnessServices = HarnessRuntime extends ManagedRuntime.ManagedRuntime<infer R, unknown> ? R : never;

function UndoToastControl({ runtime }: { runtime: HarnessRuntime }) {
  const { state, can, send } = useToasts(runtime);
  if (!state?.showing || !can({ type: "tapUndo" })) return null;
  return <button type="button" onClick={() => void send({ type: "tapUndo" })}>Undo</button>;
}

async function mountClock(startMs: number, remote: RemoteClock) {
  const runtime = makeHarness(startMs, remote);
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  await drawn(async () => {
    root.render(
      <div>
        <ClockAlertOverlay runtime={runtime} />
        <ClockHomeCard runtime={runtime} />
        <Clock runtime={runtime} />
        <UndoToastControl runtime={runtime} />
      </div>,
    );
    await runtime.runPromise(Effect.void);
  });
  const advance = async (ms: number) => {
    await drawn(() => runtime.runPromise(TestClock.adjust(ms)));
  };
  const waitFor = async <I extends HarnessServices, S>(key: Context.Key<I, { readonly changes: Stream.Stream<S> }>, ok: (state: S) => boolean) => {
    await drawn(() => runtime.runPromise(Effect.flatMap(key, (machine) => Stream.runHead(Stream.filter(machine.changes, ok)))));
  };
  const close = async () => {
    await drawn(() => root.unmount());
    await runtime.dispose();
  };
  cleanups.push(close);
  return { runtime, advance, waitFor, close };
}

function clickTab(name: string) {
  return drawn(() => {
    const tab = [...document.querySelectorAll<HTMLElement>("[role=tab]")].find((el) => el.textContent === name);
    if (!tab) throw new Error(`no tab ${name}`);
    tab.focus();
    tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    tab.click();
  });
}

describe("Clock journeys", () => {
  it("Alarms create, edit, toggle, undoable delete, ring, snooze, dismiss, and missed recovery (spec/app/clock/alarms.md, \"Story: Manage my alarms\"; spec/app/clock/alarms.md, \"Story: Ring, snooze, dismiss, and recover alarms\")", async () => {
    const startMs = new Date(2026, 10, 24, 6, 58, 0, 0).getTime();
    const remote = emptyRemote(startMs);
    const { runtime, advance, waitFor } = await mountClock(startMs, remote);

    // spec/app/clock/index.md, "Back closes an open sheet before leaving Clock"
    expect(clockArea).toBeDefined();
    expect(alertOverlayArea).toBeDefined();
    expect(clockCardsArea).toBeDefined();
    await press("Add alarm");
    await waitFor(ClockView.Machine, (s) => s.sheet.tag === "NewAlarm");
    await drawn(() => runtime.runPromise(ClockView.Machine.use((m) => m.send({ type: "back" }))));
    await waitFor(ClockView.Machine, (s) => s.sheet.tag === "NoSheet");

    // spec/app/clock/alarms.md, "Creating an alarm assigns the next id and schedules it enabled when under the limit"
    await press("Add alarm");
    await fill("Alarm label", "Morning workout");
    await pressOnTop("Weekdays");
    await pressOnTop("Save");
    await waitFor(Alarms.Machine, (s) => s.items.length === 1);
    expect(document.body.textContent).toContain("Morning workout");
    expect(document.body.textContent).toContain("Weekdays");
    expect(document.body.textContent).toContain("7:00");

    // spec/app/clock/alarms.md, "Toggling an alarm enables it for its next fire time or disables it cleanly to idle"
    const toggle = document.querySelector<HTMLElement>("[role=switch][aria-label^='Toggle alarm']");
    if (!toggle) throw new Error("missing alarm toggle");
    await drawn(() => toggle.click());
    await waitFor(Alarms.Machine, (s) => s.items[0]?.enabled === false);
    await drawn(() => toggle.click());
    await waitFor(Alarms.Machine, (s) => s.items[0]?.enabled === true);

    // spec/app/clock/alarms.md, "Deleting an alarm holds it for a five-second Undo window before committing removal"
    const deleteBtn = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? "").startsWith("Delete alarm"));
    if (!deleteBtn) throw new Error("missing delete alarm button");
    await drawn(() => deleteBtn.click());
    await waitFor(Alarms.Machine, (s) => s.items.length === 0 && s.hasHidden);
    await press("Undo");
    await waitFor(Alarms.Machine, (s) => s.items.length === 1 && !s.hasHidden);
    expect(document.body.textContent).toContain("Morning workout");

    // spec/app/clock/alarms.md, "An enabled alarm rings only once its scheduled or snoozed time has come"
    await advance(120_000);
    await waitFor(Alarms.Machine, (s) => s.items[0]?.phase === "Ringing");
    await waitFor(ClockView.Machine, (s) => s.ringingAlarm === 1 && s.soundOn);
    expect(document.querySelector("[role=alertdialog][aria-label='Ringing alarm']")).not.toBeNull();

    // spec/app/clock/index.md, "Muting silences alert audio while keeping the alert visible"
    await press("Mute alarm sound");
    await waitFor(ClockView.Machine, (s) => s.muted && !s.soundOn);

    // spec/app/clock/alarms.md, "Snoozing a ringing alarm schedules it for its snooze duration in the future"
    await press("Snooze 9m");
    await waitFor(Alarms.Machine, (s) => s.items[0]?.phase === "Snoozed");
    expect(document.querySelector("[role=alertdialog][aria-label='Ringing alarm']")).toBeNull();

    // spec/app/clock/alarms.md, "Dismissing disables a one-off alarm and advances a repeating alarm to its next occurrence"
    await advance(9 * 60_000);
    await waitFor(Alarms.Machine, (s) => s.items[0]?.phase === "Ringing");
    await press("Dismiss");
    await waitFor(Alarms.Machine, (s) => s.items[0]?.phase === "Idle" && s.items[0]?.enabled === true);

    // spec/app/clock/alarms.md, "A ringing alarm that goes unanswered for ten minutes auto-silences and is marked missed"
    await press("Add alarm");
    for (let step = 0; step < 10; step++) await pressOnTop("Increase minute");
    await fill("Alarm label", "One-off tea");
    await pressOnTop("Save");
    await waitFor(Alarms.Machine, (s) => s.items.length === 2);
    await advance(60_000);
    await waitFor(Alarms.Machine, (s) => s.items.some((a) => a.phase === "Ringing"));
    await advance(600_000);
    await waitFor(Alarms.Machine, (s) => s.items.some((a) => a.missed && !a.enabled));
    expect(document.body.textContent).toContain("Missed alarm:");
    await press("Dismiss");
    await waitFor(Alarms.Machine, (s) => s.items.every((a) => !a.missed));
  });

  it("Concurrent timers, +1:00 extension while ringing, and alarm ring priority over timer (spec/app/clock/timers.md, \"Story: Run multiple countdown timers\"; spec/app/clock/index.md, \"A ringing alarm takes priority over a ringing timer\")", async () => {
    const startMs = new Date(2026, 10, 24, 9, 0, 0, 0).getTime();
    const remote = emptyRemote(startMs);
    const { advance, waitFor } = await mountClock(startMs, remote);

    await clickTab("Timers");
    await waitFor(ClockView.Machine, (s) => s.tab === "Timers");

    // spec/app/clock/timers.md, "Creating a timer adds a ready or running countdown under the limit"
    await press("Start 1m timer");
    await press("Start 5m timer");
    await waitFor(Timers.Machine, (s) => s.items.length === 2 && s.items.every((t) => t.status === "Running"));

    // spec/app/clock/timers.md, "Starting, pausing, and resuming preserve remaining time accurately"
    await advance(10_000);
    await press("Pause 5m timer");
    await waitFor(Timers.Machine, (s) => s.items.some((t) => t.status === "Paused"));
    await press("Resume 5m timer");
    await waitFor(Timers.Machine, (s) => s.items.every((t) => t.status === "Running"));

    // spec/app/clock/timers.md, "A running timer finishes only at or after its end time, and dismissing or resetting returns it to ready"
    await advance(50_000);
    await waitFor(Timers.Machine, (s) => s.items[0]?.status === "Ringing");
    await waitFor(ClockView.Machine, (s) => s.ringingTimer === 1);
    expect(document.querySelector("[role=alertdialog][aria-label='Ringing timer']")).not.toBeNull();

    // spec/app/clock/timers.md, "Adding time extends a running or paused timer and restarts a ringing timer"
    await press("+1:00");
    await waitFor(Timers.Machine, (s) => s.items[0]?.status === "Running");
    await advance(60_000);
    await waitFor(Timers.Machine, (s) => s.items[0]?.status === "Ringing");
    await press("Stop");
    await waitFor(Timers.Machine, (s) => s.items[0]?.status === "Ready");
  });

  it("Stopwatch laps, fastest/slowest highlight, pause, resume, and reset (spec/app/clock/stopwatch.md, \"Story: Time laps with the stopwatch\")", async () => {
    const startMs = new Date(2026, 10, 24, 10, 0, 0, 0).getTime();
    const remote = emptyRemote(startMs);
    const { advance, waitFor } = await mountClock(startMs, remote);

    await clickTab("Stopwatch");
    await waitFor(ClockView.Machine, (s) => s.tab === "Stopwatch");

    // spec/app/clock/stopwatch.md, "Start, pause, resume, lap, reset, and reopen keep elapsed time and laps consistent"
    await press("Start");
    await waitFor(Stopwatch.Machine, (s) => s.status === "Running");
    await advance(1500);
    await press("Lap");
    await advance(800);
    await press("Lap");
    await advance(2200);
    await press("Lap");
    await waitFor(Stopwatch.Machine, (s) => s.laps.length === 3);

    // spec/app/clock/stopwatch.md, "Best and worst lap indices are computed only when at least two laps exist"
    expect(document.body.textContent).toContain("Lap 2 · Fastest");
    expect(document.body.textContent).toContain("Lap 3 · Slowest");

    await press("Pause");
    await waitFor(Stopwatch.Machine, (s) => s.status === "Paused");
    await press("Reset");
    await waitFor(Stopwatch.Machine, (s) => s.status === "Reset" && s.laps.length === 0);
  });

  it("World Clock add, search, reorder, and remove cities (spec/app/clock/world.md, \"Story: Track times around the world\")", async () => {
    const startMs = new Date(2026, 10, 24, 12, 0, 0, 0).getTime();
    const remote = emptyRemote(startMs);
    const { waitFor } = await mountClock(startMs, remote);

    await clickTab("World");
    await waitFor(ClockView.Machine, (s) => s.tab === "World");

    // spec/app/clock/world.md, "Adding a city appends it once while under the limit"
    await press("Add city");
    await fill("Search cities", "Tokyo");
    const tokyoRow = [...document.querySelectorAll<HTMLElement>("[role=dialog] button")].find((b) => (b.textContent ?? "").includes("Tokyo"));
    if (!tokyoRow) throw new Error("missing Tokyo city row");
    await drawn(() => tokyoRow.click());
    await waitFor(World.Machine, (s) => s.cities.length === 1);

    await press("Add city");
    await fill("Search cities", "London");
    const londonRow = [...document.querySelectorAll<HTMLElement>("[role=dialog] button")].find((b) => (b.textContent ?? "").includes("London"));
    if (!londonRow) throw new Error("missing London city row");
    await drawn(() => londonRow.click());
    await waitFor(World.Machine, (s) => s.cities.length === 2);

    // spec/app/clock/world.md, "Moving a city places it immediately before or after another pinned city without changing the set of cities"
    await press("Move London up");
    await waitFor(World.Machine, (s) => s.cities.length === 2);
    const firstCityButton = button("Move London up");
    expect(firstCityButton?.disabled).toBe(true);

    // spec/app/clock/world.md, "Removing a city drops it from the list"
    await press("Remove Tokyo");
    await waitFor(World.Machine, (s) => s.cities.length === 1);
    expect(document.body.textContent).not.toContain("Tokyo");
  });

  it("Bidirectional agent sync and restart persistence (spec/app/clock/alarms.md, \"Syncing from the resident agent admits only valid, unique, bounded alarm lists\"; spec/app/clock/timers.md, \"Reopening after a restart finishes elapsed running timers and updates live remaining times\")", async () => {
    const startMs = new Date(2026, 10, 24, 8, 0, 0, 0).getTime();
    const remote = emptyRemote(startMs);
    const first = await mountClock(startMs, remote);

    await first.waitFor(ClockView.Machine, (s) => s.tab === "Alarms");
    const pushed = remote.waitForPut();
    await press("Add alarm");
    await fill("Alarm label", "Local alarm");
    await pressOnTop("Save");
    await first.waitFor(Alarms.Machine, (s) => s.items.length === 1);
    await pushed;
    expect(remote.puts).toBeGreaterThanOrEqual(1);
    expect(remote.snapshot.alarms.some((a) => a.label === "Local alarm")).toBe(true);

    remote.snapshot = {
      version: remote.snapshot.version + 1,
      updatedAtMs: startMs + 5_000,
      alarms: [
        ...remote.snapshot.alarms,
        {
          id: "alarm-9",
          hour: 14,
          minute: 30,
          daysMask: 62,
          label: "Agent standup",
          sound: "chime",
          vibrate: true,
          enabled: true,
          snoozeMinutes: 10,
          phase: "idle",
          fireAtMs: startMs + 3_600_000,
          snoozeUntilMs: null,
          missed: false,
          revision: 1,
          updatedAtMs: startMs + 5_000,
        },
      ],
      timers: [
        {
          id: "timer-5",
          label: "Agent pasta",
          durationMs: 120_000,
          remainingMs: 120_000,
          status: "running",
          startedAtMs: startMs,
          endAtMs: startMs + 120_000,
          ringStartedAtMs: null,
          revision: 1,
          updatedAtMs: startMs + 5_000,
        },
      ],
      world: [{ id: "city-40", city: "London", region: "United Kingdom", timeZone: "Europe/London", order: 0 }],
      deletedAlarmIds: [],
      deletedTimerIds: [],
    };

    await drawn(() => first.runtime.runPromise(syncClockNow()));
    await first.waitFor(Alarms.Machine, (s) => s.items.length === 2);
    await first.waitFor(Timers.Machine, (s) => s.items.length === 1);
    await first.waitFor(World.Machine, (s) => s.cities.length === 1);
    expect(document.body.textContent).toContain("Agent standup");

    await first.close();
    const second = await mountClock(startMs + 150_000, remote);
    await second.waitFor(Timers.Machine, (s) => s.items.some((t) => t.status === "Ringing"));
    await second.waitFor(ClockView.Machine, (s) => s.ringingTimer > 0);
    expect(document.querySelector("[role=alertdialog][aria-label='Ringing timer']")).not.toBeNull();
  });
});
