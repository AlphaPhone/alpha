// @vitest-environment happy-dom
// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"; spec/app/reminders/index.md, "Story: Create, update, flag, move, complete and delete reminders with Undo"; spec/app/reminders/alerts.md, "Story: Alert on due reminders and act from the banner"; spec/app/reminders/recurrence.md, "Story: Advance recurring reminder dates cleanly across months and leap years"
import { HttpClient, HttpClientResponse } from "effect/http";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { afterEach, describe, expect, it } from "vitest";
import * as RemindersMachine from "../gen/app__reminders.effect.vibe";
import * as AlertsMachine from "../gen/app__reminders__alerts.effect.vibe";
import { at } from "../src/areas.ts";
import { agentAt } from "../src/platform/agent.vibe";
import { cloudAt } from "../src/platform/cloud.vibe";
import { pagePlatform } from "../src/platform/platform.vibe";
import { type NativeRemindersPort, setNativeRemindersPort } from "../src/reminders/alerts.vibe";
import alertOverlayArea from "../src/reminders/alertOverlay.tsx";
import remindersArea from "../src/reminders/index.tsx";
import { advanceDueDate, civilDateAt, dueInstantMs, formatCivilDate, formatRelativeDue } from "../src/reminders/recurrence.ts";
import {
  createReminderItem,
  createReminderList,
  deleteReminderItem,
  deleteReminderList,
  resetReminderStores,
  syncRemindersNow,
  toggleReminderComplete,
  toggleReminderFlag,
  updateReminderList,
} from "../src/reminders/reminders.vibe";
import {
  computeSmartCounts,
  DEFAULT_LIST_ID,
  defaultSnapshot,
  type ReminderItemRecord,
  type ReminderListRecord,
  remindersStore,
  type RemindersSnapshot,
} from "../src/reminders/store.ts";
import { button, closeAll, drawn, fill, later, only, openOver, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();

interface AgentRecorder {
  snapshot: RemindersSnapshot;
  readonly calls: { readonly method: string; readonly path: string }[];
}

function makeFakeAgentReminders(initialNowMs: number): { readonly recorder: AgentRecorder; readonly layer: Layer.Layer<HttpClient.HttpClient> } {
  const recorder: AgentRecorder = {
    snapshot: defaultSnapshot(initialNowMs),
    calls: [],
  };
  const layer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => Effect.sync(() => {
      const path = url.pathname;
      const method = request.method;
      recorder.calls.push({ method, path });
      const rawBody = request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "";
      const parsed = rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};

      if (path === "/api/health") {
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ ready: true }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path === "/api/alpha/reminders" && method === "GET") {
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify(recorder.snapshot), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path === "/api/alpha/reminders/lists" && method === "POST") {
        const list = parsed as unknown as ReminderListRecord;
        recorder.snapshot = { ...recorder.snapshot, version: recorder.snapshot.version + 1, lists: [...recorder.snapshot.lists, list] };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify(list), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.startsWith("/api/alpha/reminders/lists/") && method === "PATCH") {
        const id = decodeURIComponent(path.slice("/api/alpha/reminders/lists/".length));
        const list = parsed as unknown as ReminderListRecord;
        recorder.snapshot = { ...recorder.snapshot, version: recorder.snapshot.version + 1, lists: recorder.snapshot.lists.map((l) => (l.id === id ? list : l)) };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify(list), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.startsWith("/api/alpha/reminders/lists/") && method === "DELETE") {
        const id = decodeURIComponent(path.slice("/api/alpha/reminders/lists/".length));
        const mode = url.searchParams.get("mode");
        recorder.snapshot = {
          ...recorder.snapshot,
          version: recorder.snapshot.version + 1,
          lists: recorder.snapshot.lists.filter((l) => l.id !== id),
          items: mode === "cascade"
            ? recorder.snapshot.items.filter((i) => i.listId !== id)
            : recorder.snapshot.items.map((i) => (i.listId === id ? { ...i, listId: DEFAULT_LIST_ID } : i)),
        };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path === "/api/alpha/reminders/items" && method === "POST") {
        const item = parsed as unknown as ReminderItemRecord;
        recorder.snapshot = { ...recorder.snapshot, version: recorder.snapshot.version + 1, items: [...recorder.snapshot.items, item] };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify(item), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.startsWith("/api/alpha/reminders/items/") && method === "PATCH") {
        const id = decodeURIComponent(path.slice("/api/alpha/reminders/items/".length));
        recorder.snapshot = {
          ...recorder.snapshot,
          version: recorder.snapshot.version + 1,
          items: recorder.snapshot.items.map((i) => (i.id === id ? { ...i, ...parsed } : i)),
        };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.startsWith("/api/alpha/reminders/items/") && method === "DELETE") {
        const id = decodeURIComponent(path.slice("/api/alpha/reminders/items/".length));
        recorder.snapshot = { ...recorder.snapshot, version: recorder.snapshot.version + 1, items: recorder.snapshot.items.filter((i) => i.id !== id) };
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (path.startsWith("/api/alpha/reminders/items/") && method === "POST") {
        const suffix = path.slice("/api/alpha/reminders/items/".length);
        const [rawId, action] = suffix.split("/");
        const id = decodeURIComponent(rawId ?? "");
        if (action === "complete") {
          const item = (parsed.item as ReminderItemRecord | undefined);
          recorder.snapshot = {
            ...recorder.snapshot,
            version: recorder.snapshot.version + 1,
            items: recorder.snapshot.items.map((i) => (i.id === id ? (item ?? { ...i, completed: true }) : i)),
          };
        } else if (action === "reopen") {
          recorder.snapshot = {
            ...recorder.snapshot,
            version: recorder.snapshot.version + 1,
            items: recorder.snapshot.items.map((i) => (i.id === id ? { ...i, completed: false, completedAtMs: null } : i)),
          };
        } else if (action === "restore") {
          const item = parsed.item as ReminderItemRecord | undefined;
          if (item) {
            recorder.snapshot = {
              ...recorder.snapshot,
              version: recorder.snapshot.version + 1,
              items: recorder.snapshot.items.map((i) => (i.id === id ? item : i)),
            };
          }
        } else if (action === "snooze") {
          const untilMs = Number(parsed.snoozedUntilMs ?? 0);
          recorder.snapshot = {
            ...recorder.snapshot,
            version: recorder.snapshot.version + 1,
            items: recorder.snapshot.items.map((i) => (i.id === id ? { ...i, snoozedUntilMs: untilMs } : i)),
          };
        }
        return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      return HttpClientResponse.fromWeb(request, new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } }));
    })),
  );
  return { recorder, layer };
}

const withReminders = [
  ...only("home", "notice"),
  at("view:Reminders", () => Promise.resolve({ default: remindersArea })),
  at("overlay", () => Promise.resolve({ default: alertOverlayArea })),
];

function makePlatform(nowMs: number, agentHttp: Layer.Layer<HttpClient.HttpClient>) {
  const clock = Layer.provideMerge(Layer.effectDiscard(TestClock.setTime(nowMs)), TestClock.layer());
  const base = pagePlatform(
    Layer.provide(agentAt("http://agent.test"), agentHttp),
    Layer.provide(cloudAt("http://cloud.test"), agentHttp),
  );
  return Layer.provideMerge(base, clock);
}

afterEach(async () => {
  setNativeRemindersPort(undefined);
  resetReminderStores();
  await closeAll();
});

describe("Reminders recurrence laws", () => {
  // spec/app/reminders/recurrence.md, "Story: Advance recurring reminder dates cleanly across months and leap years"
  it("advances daily, weekday, weekly, monthly (clamped) and yearly (leap-clamped) dates strictly later", () => {
    expect(advanceDueDate("2026-05-01", "daily")).toBe("2026-05-02");
    expect(advanceDueDate("2026-05-01", "weekdays")).toBe("2026-05-04");
    expect(advanceDueDate("2026-05-01", "weekly")).toBe("2026-05-08");
    expect(advanceDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advanceDueDate("2024-01-31", "monthly")).toBe("2024-02-29");
    expect(advanceDueDate("2024-02-29", "yearly")).toBe("2025-02-28");
    expect(advanceDueDate("2027-02-28", "yearly")).toBe("2028-02-28");
    expect(formatRelativeDue("2026-05-01", 540, dueInstantMs("2026-05-01", 480)!, false)).toContain("Today");
  });
});

describe("Reminders full journeys", () => {
  const baseNow = Date.UTC(2026, 4, 15, 13, 0, 0);

  async function launchReminders(nowMs: number) {
    const world = { ...scene(), now: nowMs };
    const { recorder, layer: agentHttp } = makeFakeAgentReminders(world.now);
    const platform = makePlatform(world.now, agentHttp);
    const opened = await openOver(platform, withReminders);
    const runtime = remindersArea.runtime(opened.alpha);
    await press("Reminders");
    await until(opened.alpha, runtime, RemindersMachine.Machine, (s) => s.sync.status === "Loaded");
    return { world, recorder, platform, ...opened, runtime };
  }

  // spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"
  it("organizes smart lists, custom lists (rename + reassign/cascade delete), search and editor creation", async () => {
    const { world, recorder, alpha, runtime } = await launchReminders(baseNow);
    expect(document.body.textContent).toContain("Today");
    expect(document.body.textContent).toContain("Scheduled");
    expect(document.body.textContent).toContain("Reminders");

    const today = formatCivilDate(civilDateAt(world.now));
    const work = await runtime.runPromise(createReminderList("Work", "green", "work"));
    expect(work?.name).toBe("Work");
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    const errands = await runtime.runPromise(createReminderList("Errands", "amber", "shopping"));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    await runtime.runPromise(updateReminderList(work!.id, "Deep Work", "violet", "bolt"));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    const dueItem = await runtime.runPromise(createReminderItem({
      listId: work!.id,
      title: "Ship Alpha Reminders",
      notes: "Verify proofs and UI polish",
      dueDate: today,
      dueMinute: 23 * 60,
      recurrence: "daily",
      priority: "high",
      flagged: true,
      subtasks: [{ id: "s1", title: "Run Dafny", done: true }, { id: "s2", title: "Test banner", done: false }],
    }));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    await runtime.runPromise(createReminderItem({
      listId: errands!.id,
      title: "Buy coffee beans",
      dueDate: formatCivilDate(civilDateAt(world.now - 2 * 86_400_000)),
      priority: "low",
    }));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    // spec/app/reminders/index.md, "Smart-list counts stay mathematically consistent across Overdue, Today, Scheduled, Flagged, All and Completed"
    const counts = computeSmartCounts(remindersStore.snapshot().snapshot.items, remindersStore.snapshot().hiddenIds, world.now);
    expect(counts.OverdueView).toBe(1);
    expect(counts.TodayView).toBe(2);
    expect(counts.ScheduledView).toBe(2);
    expect(counts.FlaggedView).toBe(1);
    expect(counts.AllView).toBe(2);
    expect(counts.CompletedView).toBe(0);

    // spec/app/reminders/index.md, "Switching smart views, custom lists, sort, filter, search and item selection keeps every reference valid": live search across notes and subtasks
    await fill("Search reminders", "Dafny");
    expect(document.body.textContent).toContain("Ship Alpha Reminders");
    await fill("Search reminders", "");

    // spec/app/reminders/index.md, "Creating, renaming and deleting custom lists protects the default Reminders list and keeps every item in a valid list"
    await runtime.runPromise(deleteReminderList(work!.id, "ReassignToDefault"));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.find((i) => i.id === dueItem!.id)?.listId).toBe(DEFAULT_LIST_ID);

    await runtime.runPromise(deleteReminderList(errands!.id, "CascadeItems"));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.some((i) => i.title === "Buy coffee beans")).toBe(false);
    expect(recorder.calls.some((c) => c.method === "DELETE" && c.path.includes("/lists/"))).toBe(true);
  });

  // spec/app/reminders/index.md, "Completing a reminder holds a five-second Undo snapshot and advances a repeating reminder to its next due day"
  // spec/app/reminders/index.md, "Deleting a reminder hides it immediately and holds it for five seconds before committing the deletion"
  it("advances recurring completion with 5s Undo and holds delete for 5s before committing to agent", async () => {
    const { world, recorder, alpha, runtime } = await launchReminders(baseNow);

    const today = formatCivilDate(civilDateAt(world.now));
    const expectedNext = advanceDueDate(today, "daily");
    const recurring = await runtime.runPromise(createReminderItem({
      listId: DEFAULT_LIST_ID,
      title: "Take vitamins",
      dueDate: today,
      recurrence: "daily",
    }));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");

    // spec/app/reminders/index.md, "Completing a reminder holds a five-second Undo snapshot and advances a repeating reminder to its next due day"
    await drawn(() => runtime.runPromise(toggleReminderComplete(recurring!.id)));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    const afterComplete = remindersStore.snapshot().snapshot.items.find((i) => i.id === recurring!.id)!;
    expect(afterComplete.completed).toBe(false);
    expect(afterComplete.dueDate).toBe(expectedNext);
    expect(Boolean(button("Undo"))).toBe(true);

    await later(alpha, 2_000);
    await press("Undo");
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.undo.holding === "Undone" && s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.find((i) => i.id === recurring!.id)?.dueDate).toBe(today);

    // spec/app/reminders/index.md, "Creating, updating, flagging and moving a reminder validates its list, due time and recurrence and sends one write at a time"
    await drawn(() => runtime.runPromise(toggleReminderFlag(recurring!.id)));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.find((i) => i.id === recurring!.id)?.flagged).toBe(true);

    // spec/app/reminders/index.md, "Undo within five seconds restores a hidden deletion or reverts the completed reminder's exact prior state"
    await drawn(() => runtime.runPromise(deleteReminderItem(recurring!.id)));
    expect(remindersStore.snapshot().hiddenIds.has(recurring!.id)).toBe(true);
    await later(alpha, 3_000);
    await press("Undo");
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.undo.holding === "Undone");
    expect(remindersStore.snapshot().hiddenIds.size).toBe(0);
    expect(recorder.calls.some((c) => c.method === "DELETE" && c.path.includes("/items/"))).toBe(false);

    // spec/app/reminders/index.md, "Once the five-second window expires, a held deletion is committed and a held completion settles"
    await drawn(() => runtime.runPromise(deleteReminderItem(recurring!.id)));
    await later(alpha, 5_100);
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.undo.holding === "Released" && s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.length).toBe(0);
    expect(recorder.calls.some((c) => c.method === "DELETE" && c.path.includes(`/items/${recurring!.id}`))).toBe(true);
  });

  // spec/app/reminders/alerts.md, "Story: Alert on due reminders and act from the banner"
  it("fires due reminder alert on time (never early), snoozes 10m and completes from banner, and syncs chat updates across restarts", async () => {
    const armed: { readonly id: string; readonly at: number }[] = [];
    const nativePort: NativeRemindersPort = {
      schedule: (input) => { armed.push({ id: input.id, at: input.at }); return Promise.resolve(); },
      cancel: () => Promise.resolve(),
      list: () => Promise.resolve([]),
      pendingTap: () => Promise.resolve({}),
      consumeTap: () => Promise.resolve(),
    };
    setNativeRemindersPort(nativePort);

    const first = await launchReminders(baseNow);
    const { world, recorder, platform, alpha, runtime } = first;

    const fireAt = world.now + 10 * 60_000;
    const fireDate = formatCivilDate(civilDateAt(fireAt));
    const d = new Date(fireAt);
    const dueMinute = d.getHours() * 60 + d.getMinutes();

    const item = await runtime.runPromise(createReminderItem({
      listId: DEFAULT_LIST_ID,
      title: "Join standup",
      dueDate: fireDate,
      dueMinute,
      alertMinutes: 0,
    }));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    await until(alpha, runtime, AlertsMachine.Machine, (s) => s.entries.some((entry) => entry.phase === "Scheduled"));
    await drawn(() => Promise.resolve());
    expect(armed.some((a) => a.id === item!.id)).toBe(true);

    // spec/app/reminders/alerts.md, "An alert rings only once its due time has arrived and never for a completed reminder"
    await later(alpha, 5 * 60_000);
    expect(document.querySelector("[role=alertdialog]")).toBeNull();

    await later(alpha, 6 * 60_000);
    await until(alpha, runtime, AlertsMachine.Machine, (s) => s.bannerId > 0);
    expect(document.querySelector("[role=alertdialog]")?.textContent).toContain("Join standup");

    // spec/app/reminders/alerts.md, "Snoozing from the banner moves the exact ringing revision strictly into the future, clears the banner, re-arms it and syncs once"
    await press("10m");
    await until(alpha, runtime, AlertsMachine.Machine, (s) => s.bannerId === 0);
    expect(document.querySelector("[role=alertdialog]")).toBeNull();

    // spec/app/reminders/alerts.md, "Completing from the banner marks the exact ringing revision completed, clears the banner and syncs once"
    await later(alpha, 10 * 60_000 + 1_000);
    await until(alpha, runtime, AlertsMachine.Machine, (s) => s.bannerId > 0);
    await press("Complete");
    await until(alpha, runtime, AlertsMachine.Machine, (s) => s.bannerId === 0);
    expect(remindersStore.snapshot().snapshot.items.find((i) => i.id === item!.id)?.completed).toBe(true);

    // spec/app/reminders/index.md, "Refreshing fetches under the next ticket, only the newest answer settles, and a change from chat refreshes once free"
    const chatItem: ReminderItemRecord = {
      id: "rem_chat_1",
      listId: DEFAULT_LIST_ID,
      title: "Call dentist from chat",
      notes: "Created by Alpha",
      dueDate: fireDate,
      dueMinute: null,
      alertMinutes: null,
      recurrence: "none",
      priority: "medium",
      flagged: false,
      subtasks: [],
      completed: false,
      completedAtMs: null,
      snoozedUntilMs: null,
      notifiedAtMs: null,
      agentTaskId: "task_99",
      revision: 1,
      createdAtMs: world.now,
      updatedAtMs: world.now,
    };
    recorder.snapshot = { ...recorder.snapshot, version: recorder.snapshot.version + 1, items: [...recorder.snapshot.items, chatItem] };
    await drawn(() => runtime.runPromise(syncRemindersNow()));
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.sync.status === "Loaded" && !s.again);
    expect(remindersStore.snapshot().snapshot.items.some((i) => i.id === "rem_chat_1")).toBe(true);

    // spec/app/reminders/editor.md, "Story: Create or edit a reminder with safe validation and draft recovery"
    await press("New reminder");
    await fill("Title", "Pack passport");
    await pressOnTop("Save");
    await until(alpha, runtime, RemindersMachine.Machine, (s) => s.write.outcome === "Confirmed");
    expect(remindersStore.snapshot().snapshot.items.some((i) => i.title === "Pack passport")).toBe(true);

    // spec/app/reminders/index.md, "Story: Sync with the resident agent and recover across restarts"
    await first.close();
    const second = await openOver(platform, withReminders);
    const secondRuntime = remindersArea.runtime(second.alpha);
    await until(second.alpha, secondRuntime, RemindersMachine.Machine, (s) => s.sync.status === "Loaded");
    expect(remindersStore.snapshot().snapshot.items.some((i) => i.title === "Pack passport")).toBe(true);
  });
});
