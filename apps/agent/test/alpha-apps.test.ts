// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AlphaAppsStore, alphaAppsPluginName, createAlphaAppsPlugin } from "../src/plugins/index.ts";
import { advanceDueDate } from "../src/plugins/store.ts";
import type { AgentRoute, AgentRuntimeLike, ClockSnapshot, ReminderItemRecord, RemindersSnapshot } from "../src/plugins/types.ts";

const emptyMessage = (text: string, metadata?: Record<string, unknown>) =>
  ({ content: { text }, metadata }) as unknown as Parameters<NonNullable<ReturnType<typeof createAlphaAppsPlugin>["plugin"]["actions"]>[number]["handler"]>[1];

const emptyState = {} as unknown as NonNullable<Parameters<NonNullable<ReturnType<typeof createAlphaAppsPlugin>["plugin"]["actions"]>[number]["handler"]>[2]>;

function makeFakeRuntime(initialTasks: readonly {
  readonly taskId: string;
  readonly kind: string;
  readonly ownerVisible: boolean;
  readonly promptInstructions: string;
  readonly status: string;
  readonly trigger: { readonly kind: string; readonly atIso?: string };
  readonly metadata: Readonly<Record<string, unknown>>;
}[] = []) {
  const tasks = [...initialTasks];
  const notifications: unknown[] = [];
  const runtime = {
    getService: (name: string) => {
      if (name === "scheduled-tasks") {
        return {
          list: () => Promise.resolve([...tasks]),
          create: (task: { kind: string; ownerVisible: boolean; promptInstructions: string; trigger: { kind: string; atIso?: string }; metadata: Record<string, unknown> }) => {
            const created = { taskId: `task-${tasks.length + 1}`, ...task, status: "Scheduled" };
            tasks.push(created);
            return Promise.resolve({ kind: "created", task: created });
          },
        };
      }
      if (name === "notification") {
        return {
          notify: (input: unknown) => {
            notifications.push(input);
            return Promise.resolve({ id: `notif-${notifications.length}` });
          },
        };
      }
      return null;
    },
  } as unknown as AgentRuntimeLike;
  return { runtime, tasks, notifications };
}

async function callRoute(
  routes: readonly AgentRoute[],
  method: string,
  routePath: string,
  options: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
) {
  const route = routes.find((r) => r.method === method && r.path === routePath);
  if (route === undefined) throw new Error(`Missing route ${method} ${routePath}`);
  const result = await route.handler({
    parameters: new Map(Object.entries(options.params ?? {})),
    query: new Map(Object.entries(options.query ?? {})),
    headers: new Map(),
    body: options.body,
    signal: new AbortController().signal,
  });
  return result as { status: number; body: Record<string, unknown> };
}

describe("Alpha product plugin: what the model may pass and what the owner sees", () => {
  it("declares each action's parameters, so a call with the model's arguments runs, and echoes no result text to the owner", async () => {
    const store = new AlphaAppsStore({ now: () => Date.UTC(2026, 10, 24, 18, 0) });
    const { plugin } = createAlphaAppsPlugin({ store, timeZone: "UTC", runtime: makeFakeRuntime().runtime });
    const declared = Object.fromEntries((plugin.actions ?? []).map((action) => [action.name, (action.parameters ?? []).map((parameter) => parameter.name)]));
    expect(declared.CLOCK_TIMER).toEqual(expect.arrayContaining(["action", "durationSeconds", "label", "id"]));
    expect(declared.CLOCK_ALARM).toEqual(expect.arrayContaining(["action", "hour", "minute", "days", "label", "enabled", "id"]));
    expect(declared.CLOCK_WORLD).toEqual(expect.arrayContaining(["action", "city", "timeZone"]));
    expect(declared.REMINDERS_MANAGE).toEqual(expect.arrayContaining(["op", "title", "dueDate", "dueMinute", "id"]));
    const said: string[] = [];
    const callback = (content: { text?: string }) => { said.push(content.text ?? ""); return Promise.resolve([]); };
    const timer = plugin.actions!.find((action) => action.name === "CLOCK_TIMER")!;
    const started = await timer.handler(makeFakeRuntime().runtime, emptyMessage("Set a timer for 5 minutes"), emptyState, { parameters: { action: "start", durationSeconds: 300 } }, callback as never);
    expect(started?.success).toBe(true);
    expect(store.getClock().timers[0]?.durationMs).toBe(300_000);
    const reminders = plugin.actions!.find((action) => action.name === "REMINDERS_MANAGE")!;
    const added = await reminders.handler(makeFakeRuntime().runtime, emptyMessage("remind me to call the plumber at 6pm"), emptyState, { parameters: { op: "create", title: "Call the plumber", dueDate: "2026-11-24", dueMinute: 1080 } }, callback as never);
    expect(added?.success).toBe(true);
    expect(store.getReminders().items.map(({ title, dueDate, dueMinute }) => ({ title, dueDate, dueMinute }))).toEqual([{ title: "Call the plumber", dueDate: "2026-11-24", dueMinute: 1080 }]);
    expect(said).toEqual([]);
  });
});

describe("Alpha product plugin: Clock actions, provider, and routes", () => {
  // spec/agent/index.md, "The agent may run the actions the old phone's agent ran plus Alpha's Clock and Reminders actions, and every other action the bundle registers is listed as refused with its reason"
  it("runs CLOCK_ALARM, CLOCK_TIMER, CLOCK_WORLD actions and injects CLOCK_CONTEXT", async () => {
    let nowMs = Date.UTC(2026, 10, 24, 14, 0, 0);
    const store = new AlphaAppsStore({ now: () => nowMs });
    const { runtime } = makeFakeRuntime();
    const { plugin } = createAlphaAppsPlugin({ store, timeZone: "UTC", runtime });
    expect(plugin.name).toBe(alphaAppsPluginName);
    expect(plugin.views?.map((v) => v.id)).toEqual(["clock", "reminders"]);

    const alarmAction = plugin.actions!.find((a) => a.name === "CLOCK_ALARM")!;
    const timerAction = plugin.actions!.find((a) => a.name === "CLOCK_TIMER")!;
    const worldAction = plugin.actions!.find((a) => a.name === "CLOCK_WORLD")!;
    const provider = plugin.providers!.find((p) => p.name === "CLOCK_CONTEXT")!;

    const setRes = await alarmAction.handler(runtime, emptyMessage("Set an alarm for 7:30 am weekdays labeled Standup"), emptyState, { parameters: {} });
    expect(setRes?.success).toBe(true);
    const alarmId = ((setRes?.data as { alarm: { id: string } }).alarm).id;
    expect(store.getClock().alarms[0]?.daysMask).toBe(62);

    const toggleRes = await alarmAction.handler(runtime, emptyMessage("Turn off alarm"), emptyState, { parameters: { action: "toggle", id: alarmId, enabled: false } });
    expect(toggleRes?.success).toBe(true);
    expect(store.getClock().alarms[0]?.enabled).toBe(false);

    await alarmAction.handler(runtime, emptyMessage("Update alarm"), emptyState, { parameters: { action: "update", id: alarmId, hour: 8, minute: 15, enabled: true } });
    expect(store.getClock().alarms[0]?.hour).toBe(8);

    const snoozeRes = await alarmAction.handler(runtime, emptyMessage("Snooze"), emptyState, { parameters: { action: "snooze", id: alarmId, minutes: 10 } });
    expect(snoozeRes?.success).toBe(true);
    expect(store.getClock().alarms[0]?.phase).toBe("snoozed");

    const dismissRes = await alarmAction.handler(runtime, emptyMessage("Dismiss"), emptyState, { parameters: { action: "dismiss", id: alarmId } });
    expect(dismissRes?.success).toBe(true);
    expect(store.getClock().alarms[0]?.phase).toBe("idle");
    expect(store.getClock().alarms[0]?.enabled).toBe(true);

    const timerStart = await timerAction.handler(runtime, emptyMessage("Start a 5 minute timer for pasta"), emptyState, { parameters: {} });
    expect(timerStart?.success).toBe(true);
    const timerId = ((timerStart?.data as { timer: { id: string } }).timer).id;

    nowMs += 60_000;
    await timerAction.handler(runtime, emptyMessage("Pause timer"), emptyState, { parameters: { action: "pause", id: timerId } });
    expect(store.getClock().timers[0]?.status).toBe("paused");
    expect(store.getClock().timers[0]?.remainingMs).toBe(240_000);

    await timerAction.handler(runtime, emptyMessage("Resume timer"), emptyState, { parameters: { action: "resume", id: timerId } });
    await timerAction.handler(runtime, emptyMessage("Add 1 minute"), emptyState, { parameters: { action: "add_time", id: timerId, addMs: 60_000 } });
    expect(store.getClock().timers[0]?.remainingMs).toBe(300_000);

    const worldAdd = await worldAction.handler(runtime, emptyMessage("Add Tokyo"), emptyState, { parameters: { action: "add_city", city: "Tokyo" } });
    expect(worldAdd?.success).toBe(true);
    const timeIn = await worldAction.handler(runtime, emptyMessage("What time is it in London?"), emptyState, { parameters: { action: "time_in", city: "London" } });
    expect(timeIn?.success).toBe(true);
    expect(timeIn?.text).toContain("London");

    nowMs += 300_000;
    const context = await provider.get(runtime, emptyMessage("stop it"), emptyState);
    expect(context.text).toContain("Ringing right now");
    expect(context.text).toContain("Tokyo");

    await timerAction.handler(runtime, emptyMessage("Dismiss timer"), emptyState, { parameters: { action: "dismiss", id: timerId } });
    expect(store.getClock().timers[0]?.status).toBe("ready");
    await timerAction.handler(runtime, emptyMessage("Cancel timer"), emptyState, { parameters: { action: "cancel", id: timerId } });
    expect(store.getClock().timers).toHaveLength(0);
    await worldAction.handler(runtime, emptyMessage("Remove Tokyo"), emptyState, { parameters: { action: "remove_city", city: "Tokyo" } });
    expect(store.getClock().world).toHaveLength(0);
    await alarmAction.handler(runtime, emptyMessage("Delete alarm"), emptyState, { parameters: { action: "delete", id: alarmId } });
    expect(store.getClock().alarms).toHaveLength(0);
  });

  // spec/agent/index.md, "The page reaches exactly the routes its platform services call, and nothing else"
  it("serves all /api/alpha/clock/* routes with LWW sync and specific 404 error codes", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-apps-clock-"));
    try {
      const store = new AlphaAppsStore({ stateDirectory: dir });
      const { plugin } = createAlphaAppsPlugin({ store, timeZone: "UTC" });
      const routes = plugin.routes!;

      const created = await callRoute(routes, "POST", "/api/alpha/clock/alarms", { body: { hour: 6, minute: 45, label: "Run" } });
      expect(created.status).toBe(201);
      const alarmId = (created.body.alarm as { id: string }).id;

      const patched = await callRoute(routes, "PATCH", "/api/alpha/clock/alarms/{id}", { params: { id: alarmId }, body: { label: "Morning Run" } });
      expect(patched.status).toBe(200);
      expect((patched.body.alarm as { label: string }).label).toBe("Morning Run");

      const snoozed = await callRoute(routes, "POST", "/api/alpha/clock/alarms/{id}/snooze", { params: { id: alarmId }, body: { minutes: 5 } });
      expect(snoozed.status).toBe(200);

      const dismissed = await callRoute(routes, "POST", "/api/alpha/clock/alarms/{id}/dismiss", { params: { id: alarmId } });
      expect(dismissed.status).toBe(200);

      const missingAlarm = await callRoute(routes, "DELETE", "/api/alpha/clock/alarms/{id}", { params: { id: "missing" } });
      expect(missingAlarm).toEqual({ status: 404, body: { error: "alarm_not_found" } });

      const timer = await callRoute(routes, "POST", "/api/alpha/clock/timers", { body: { durationMs: 120_000, label: "Tea" } });
      expect(timer.status).toBe(201);
      const timerId = (timer.body.timer as { id: string }).id;
      const timerPatched = await callRoute(routes, "PATCH", "/api/alpha/clock/timers/{id}", { params: { id: timerId }, body: { action: "pause" } });
      expect(timerPatched.status).toBe(200);

      const city = await callRoute(routes, "POST", "/api/alpha/clock/world", { body: { city: "Paris" } });
      expect(city.status).toBe(201);
      const cityId = (city.body.city as { id: string }).id;

      const synced = await callRoute(routes, "PUT", "/api/alpha/clock", {
        body: { alarms: [{ ...(dismissed.body.alarm as Record<string, unknown>), label: "Synced Run", revision: 99 }] },
      });
      expect(synced.status).toBe(200);
      expect((synced.body as unknown as ClockSnapshot).alarms[0]?.label).toBe("Synced Run");

      const reloaded = new AlphaAppsStore({ stateDirectory: dir });
      expect(reloaded.getClock().alarms[0]?.label).toBe("Synced Run");
      expect(reloaded.getClock().timers[0]?.label).toBe("Tea");
      expect(reloaded.getClock().world[0]?.city).toBe("Paris");

      expect((await callRoute(routes, "DELETE", "/api/alpha/clock/world/{id}", { params: { id: cityId } })).status).toBe(200);
      expect((await callRoute(routes, "DELETE", "/api/alpha/clock/timers/{id}", { params: { id: timerId } })).status).toBe(200);
      expect((await callRoute(routes, "DELETE", "/api/alpha/clock/alarms/{id}", { params: { id: alarmId } })).status).toBe(200);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Alpha product plugin: Reminders actions, provider, recurrence, and routes", () => {
  // spec/agent/index.md, "The agent may run the actions the old phone's agent ran plus Alpha's Clock and Reminders actions, and every other action the bundle registers is listed as refused with its reason"
  it("handles recurrence edge cases accurately", () => {
    expect(advanceDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advanceDueDate("2024-01-31", "monthly")).toBe("2024-02-29");
    expect(advanceDueDate("2024-02-29", "yearly")).toBe("2025-02-28");
    expect(advanceDueDate("2026-11-27", "weekdays")).toBe("2026-11-30");
    expect(advanceDueDate("2026-11-24", "daily")).toBe("2026-11-25");
    expect(advanceDueDate("2026-11-24", "weekly")).toBe("2026-12-01");
  });

  // spec/agent/index.md, "The page reaches exactly the routes its platform services call, and nothing else"
  it("runs REMINDERS_MANAGE, reconciles OWNER_REMINDERS tasks, injects ALPHA_REMINDERS_SUMMARY, and persists routes", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-apps-rem-"));
    try {
      const nowMs = Date.UTC(2026, 10, 24, 15, 0, 0);
      const store = new AlphaAppsStore({ stateDirectory: dir, now: () => nowMs });
      const { runtime, tasks, notifications } = makeFakeRuntime([{
        taskId: "owner-task-1",
        kind: "personal-assistant.reminder",
        ownerVisible: true,
        promptInstructions: "Call dentist",
        status: "Scheduled",
        trigger: { kind: "once", atIso: "2026-11-24T13:00:00.000Z" },
        metadata: { title: "Call dentist", body: "Confirm appointment" },
      }]);
      const { plugin } = createAlphaAppsPlugin({ store, timeZone: "UTC", runtime });
      const action = plugin.actions!.find((a) => a.name === "REMINDERS_MANAGE")!;
      const provider = plugin.providers!.find((p) => p.name === "ALPHA_REMINDERS_SUMMARY")!;
      const routes = plugin.routes!;

      const listCreated = await action.handler(runtime, emptyMessage("Create Work list"), emptyState, {
        parameters: { op: "create_list", name: "Work", color: "blue", icon: "work" },
      });
      expect(listCreated?.success).toBe(true);
      const workListId = ((listCreated?.data as { list: { id: string } }).list).id;

      const created = await action.handler(runtime, emptyMessage("Add weekly report"), emptyState, {
        parameters: { op: "create", title: "Weekly report", listId: workListId, dueDate: "2026-11-24", dueMinute: 960, recurrence: "weekly", priority: "high", flagged: true, subtasks: ["Collect metrics"] },
      });
      expect(created?.success).toBe(true);
      const item = (created?.data as { item: ReminderItemRecord }).item;
      expect(item.agentTaskId).toBe("task-2");
      expect(tasks).toHaveLength(2);

      await action.handler(runtime, emptyMessage("Add subtask"), emptyState, { parameters: { op: "add_subtask", id: item.id, subtaskTitle: "Send summary" } });
      await action.handler(runtime, emptyMessage("Toggle subtask"), emptyState, { parameters: { op: "toggle_subtask", id: item.id, subtaskTitle: "Collect metrics" } });
      expect(store.getReminders().items.find((i) => i.id === item.id)?.subtasks.map((s) => s.done)).toEqual([true, false]);

      await action.handler(runtime, emptyMessage("Snooze"), emptyState, { parameters: { op: "snooze", id: item.id, minutes: 30 } });
      expect(notifications).toHaveLength(1);

      const summary = await provider.get(runtime, emptyMessage("What's overdue?"), emptyState);
      expect(summary.text).toContain("Call dentist");
      expect(summary.text).toContain("Weekly report");
      expect(summary.text).toContain("Work");

      const completed = await action.handler(runtime, emptyMessage("Complete report"), emptyState, { parameters: { op: "complete", id: item.id } });
      expect(completed?.success).toBe(true);
      const nextItem = (completed?.data as { nextItem: ReminderItemRecord | null }).nextItem;
      expect(nextItem?.dueDate).toBe("2026-12-01");
      expect(nextItem?.subtasks.every((s) => !s.done)).toBe(true);

      const deleted = await callRoute(routes, "DELETE", "/api/alpha/reminders/items/{id}", { params: { id: nextItem!.id } });
      expect(deleted.status).toBe(200);
      const restored = await callRoute(routes, "POST", "/api/alpha/reminders/items/{id}/restore", { params: { id: nextItem!.id } });
      expect(restored.status).toBe(200);

      const listDeleted = await callRoute(routes, "DELETE", "/api/alpha/reminders/lists/{id}", { params: { id: workListId }, query: { mode: "reassign" } });
      expect(listDeleted.status).toBe(200);
      const getAll = await callRoute(routes, "GET", "/api/alpha/reminders");
      const snapshot = getAll.body as unknown as RemindersSnapshot;
      expect(snapshot.items.every((entry) => entry.listId === "default")).toBe(true);

      const missing = await callRoute(routes, "DELETE", "/api/alpha/reminders/items/{id}", { params: { id: "missing" } });
      expect(missing).toEqual({ status: 404, body: { error: "reminder_not_found" } });

      const reloaded = new AlphaAppsStore({ stateDirectory: dir });
      expect(reloaded.getReminders().items.some((entry) => entry.title === "Weekly report")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
