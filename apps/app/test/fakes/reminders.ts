// spec/agent/index.md, "The page reaches exactly the routes its platform services call, and nothing else"
import type {
  AndroidReminderCancelInput, AndroidReminderRecord, AndroidReminderScheduleInput,
} from "@elizaos/os-bridges";
import type { Faked } from "./phone.ts";
import { type Route, readJsonBody } from "./routes.ts";

/** Reminder list record shape exchanged on `/api/alpha/reminders/*`. */
export interface FakeReminderList {
  id: string;
  name: string;
  color: "accent" | "blue" | "green" | "amber" | "rose" | "violet";
  icon: "list" | "home" | "work" | "shopping" | "heart" | "star" | "bookmark" | "bolt";
  isDefault: boolean;
  order: number;
  createdAtMs: number;
  updatedAtMs: number;
}

/** Reminder subtask record shape. */
export interface FakeReminderSubtask {
  id: string;
  title: string;
  done: boolean;
}

/** Reminder item record shape exchanged on `/api/alpha/reminders/*`. */
export interface FakeReminderItem {
  id: string;
  listId: string;
  title: string;
  notes: string;
  dueDate: string | null;
  dueMinute: number | null;
  alertMinutes: number | null;
  recurrence: "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  priority: "none" | "low" | "medium" | "high";
  flagged: boolean;
  subtasks: FakeReminderSubtask[];
  completed: boolean;
  completedAtMs: number | null;
  snoozedUntilMs: number | null;
  notifiedAtMs: number | null;
  agentTaskId: string | null;
  revision: number;
  createdAtMs: number;
  updatedAtMs: number;
}

/** Fake agent notification row returned by `GET /api/notifications`. */
export interface FakeNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  createdAt: number;
}

/** Mutable Reminders scene backing fake `/api/alpha/reminders/*` routes and `ElizaReminders` native plugin. */
export interface RemindersScene {
  version: number;
  updatedAtMs: number;
  lists: FakeReminderList[];
  items: FakeReminderItem[];
  deleted: Map<string, FakeReminderItem>;
  notifications: FakeNotification[];
  scheduled: Map<string, AndroidReminderRecord>;
  pendingTap: { token: string; reminderId: string; occurrenceId: string } | null;
  notificationsEnabled: boolean;
  nextId: number;
  failStatus: number | undefined;
}

/** Fresh Reminders scene seeded with the default `"Reminders"` list. */
export function remindersScene(): RemindersScene {
  return {
    version: 0,
    updatedAtMs: 0,
    lists: [{ id: "default", name: "Reminders", color: "accent", icon: "list", isDefault: true, order: 0, createdAtMs: 0, updatedAtMs: 0 }],
    items: [],
    deleted: new Map(),
    notifications: [],
    scheduled: new Map(),
    pendingTap: null,
    notificationsEnabled: true,
    nextId: 1,
    failStatus: undefined,
  };
}

const snapshotOf = (scene: RemindersScene) => ({
  version: scene.version,
  updatedAtMs: scene.updatedAtMs,
  lists: scene.lists,
  items: scene.items,
});

function advanceDate(date: string, recurrence: FakeReminderItem["recurrence"]): string | null {
  if (recurrence === "none") return null;
  const parts = date.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts as [number, number, number];
  const base = new Date(Date.UTC(y, m - 1, d));
  if (recurrence === "daily") base.setUTCDate(base.getUTCDate() + 1);
  else if (recurrence === "weekly") base.setUTCDate(base.getUTCDate() + 7);
  else if (recurrence === "weekdays") {
    const dow = base.getUTCDay();
    base.setUTCDate(base.getUTCDate() + (dow === 5 ? 3 : dow === 6 ? 2 : 1));
  } else if (recurrence === "monthly") {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    const maxDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(Math.min(d, maxDay)).padStart(2, "0")}`;
  } else {
    const ny = y + 1;
    const maxDay = new Date(Date.UTC(ny, m, 0)).getUTCDate();
    return `${String(ny).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(Math.min(d, maxDay)).padStart(2, "0")}`;
  }
  return `${String(base.getUTCFullYear()).padStart(4, "0")}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}

/** Fake agent routes serving `/api/alpha/reminders/*`, `/api/notifications*`, and `/api/scheduled-tasks` over `scene`. */
export function remindersRoutes(scene: RemindersScene, now: () => number): Route[] {
  const errOf = () =>
    scene.failStatus === undefined ? undefined : Response.json({ error: "reminders_unavailable" }, { status: scene.failStatus });
  const commitItem = (index: number, updated: FakeReminderItem, ts: number) => {
    scene.items[index] = updated;
    scene.version += 1;
    scene.updatedAtMs = ts;
    return Response.json({ item: updated, snapshot: snapshotOf(scene) });
  };

  return [
    (request, url) => {
      if (url.pathname === "/api/alpha/reminders" && request.method === "GET") {
        return errOf() ?? Response.json(snapshotOf(scene));
      }
      if (url.pathname === "/api/notifications" && request.method === "GET") {
        return Response.json({ notifications: scene.notifications });
      }
      const readHit = /^\/api\/notifications\/([^/]+)\/read$/.exec(url.pathname);
      if (readHit !== null && request.method === "POST") {
        const id = decodeURIComponent(readHit[1] ?? "");
        const row = scene.notifications.find((n) => n.id === id);
        if (row === undefined) return Response.json({ error: "notification_not_found" }, { status: 404 });
        row.read = true;
        return Response.json({ notification: row });
      }
      if (url.pathname === "/api/scheduled-tasks" && request.method === "GET") {
        return Response.json({ tasks: [] });
      }
      return undefined;
    },
    (request, url) => {
      if (url.pathname === "/api/alpha/reminders/lists" && request.method === "POST") {
        const err = errOf();
        if (err !== undefined) return err;
        return readJsonBody(request).then((body) => {
          const ts = now();
          const list: FakeReminderList = {
            id: typeof body.id === "string" && body.id !== "" ? body.id : `list-${scene.nextId++}`,
            name: typeof body.name === "string" ? body.name : "List",
            color: (typeof body.color === "string" ? body.color : "accent") as FakeReminderList["color"],
            icon: (typeof body.icon === "string" ? body.icon : "list") as FakeReminderList["icon"],
            isDefault: false,
            order: scene.lists.length,
            createdAtMs: ts,
            updatedAtMs: ts,
          };
          scene.lists = [...scene.lists, list];
          scene.version += 1;
          scene.updatedAtMs = ts;
          return Response.json({ list, snapshot: snapshotOf(scene) }, { status: 201 });
        });
      }
      const hit = /^\/api\/alpha\/reminders\/lists\/([^/]+)$/.exec(url.pathname);
      if (hit === null) return undefined;
      const err = errOf();
      if (err !== undefined) return err;
      const id = decodeURIComponent(hit[1] ?? "");
      const index = scene.lists.findIndex((entry) => entry.id === id);
      if (index < 0) return Response.json({ error: "reminder_list_not_found" }, { status: 404 });
      const existing = scene.lists[index];
      if (existing === undefined) return Response.json({ error: "reminder_list_not_found" }, { status: 404 });
      if (request.method === "PATCH") {
        return readJsonBody(request).then((body) => {
          const ts = now();
          const updated: FakeReminderList = { ...existing, ...(body as Partial<FakeReminderList>), id: existing.id, isDefault: existing.isDefault, updatedAtMs: ts };
          scene.lists[index] = updated;
          scene.version += 1;
          scene.updatedAtMs = ts;
          return Response.json({ list: updated, snapshot: snapshotOf(scene) });
        });
      }
      if (request.method === "DELETE") {
        if (existing.isDefault) return Response.json({ error: "reminder_list_not_found" }, { status: 404 });
        const mode = url.searchParams.get("mode") === "cascade" ? "cascade" : "reassign";
        scene.lists = scene.lists.filter((entry) => entry.id !== id).map((entry, idx) => ({ ...entry, order: idx }));
        scene.items = mode === "cascade"
          ? scene.items.filter((item) => item.listId !== id)
          : scene.items.map((item) => (item.listId === id ? { ...item, listId: "default", revision: item.revision + 1, updatedAtMs: now() } : item));
        scene.version += 1;
        scene.updatedAtMs = now();
        return Response.json({ list: existing, snapshot: snapshotOf(scene) });
      }
      return undefined;
    },
    (request, url) => {
      if (url.pathname === "/api/alpha/reminders/items" && request.method === "POST") {
        const err = errOf();
        if (err !== undefined) return err;
        return readJsonBody(request).then((body) => {
          const ts = now();
          const item: FakeReminderItem = {
            id: typeof body.id === "string" && body.id !== "" ? body.id : `rem-${scene.nextId++}`,
            listId: typeof body.listId === "string" && scene.lists.some((l) => l.id === body.listId) ? body.listId : "default",
            title: typeof body.title === "string" ? body.title : "Reminder",
            notes: typeof body.notes === "string" ? body.notes : "",
            dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
            dueMinute: typeof body.dueMinute === "number" ? body.dueMinute : null,
            alertMinutes: typeof body.alertMinutes === "number" ? body.alertMinutes : null,
            recurrence: (typeof body.recurrence === "string" ? body.recurrence : "none") as FakeReminderItem["recurrence"],
            priority: (typeof body.priority === "string" ? body.priority : "none") as FakeReminderItem["priority"],
            flagged: typeof body.flagged === "boolean" ? body.flagged : false,
            subtasks: Array.isArray(body.subtasks) ? (body.subtasks as FakeReminderSubtask[]) : [],
            completed: false,
            completedAtMs: null,
            snoozedUntilMs: null,
            notifiedAtMs: null,
            agentTaskId: typeof body.agentTaskId === "string" ? body.agentTaskId : null,
            revision: 1,
            createdAtMs: ts,
            updatedAtMs: ts,
          };
          scene.items = [...scene.items.filter((entry) => entry.id !== item.id), item];
          scene.version += 1;
          scene.updatedAtMs = ts;
          return Response.json({ item, snapshot: snapshotOf(scene) }, { status: 201 });
        });
      }
      const hit = /^\/api\/alpha\/reminders\/items\/([^/]+)(?:\/(complete|reopen|snooze|restore))?$/.exec(url.pathname);
      if (hit === null) return undefined;
      const err = errOf();
      if (err !== undefined) return err;
      const id = decodeURIComponent(hit[1] ?? "");
      const sub = hit[2];
      if (request.method === "POST" && sub === "restore") {
        return readJsonBody(request).then((body) => {
          const prior = scene.deleted.get(id) ?? (typeof body.item === "object" && body.item !== null ? (body.item as FakeReminderItem) : undefined);
          if (prior === undefined) return Response.json({ error: "reminder_not_found" }, { status: 404 });
          scene.deleted.delete(id);
          const ts = now();
          const restored: FakeReminderItem = { ...prior, revision: prior.revision + 1, updatedAtMs: ts };
          scene.items = scene.items.some((e) => e.id === id)
            ? scene.items.map((e) => (e.id === id ? restored : e))
            : [...scene.items, restored];
          scene.version += 1;
          scene.updatedAtMs = ts;
          return Response.json({ item: restored, snapshot: snapshotOf(scene) });
        });
      }
      const index = scene.items.findIndex((entry) => entry.id === id);
      if (index < 0) return Response.json({ error: "reminder_not_found" }, { status: 404 });
      const existing = scene.items[index];
      if (existing === undefined) return Response.json({ error: "reminder_not_found" }, { status: 404 });
      if (request.method === "DELETE" && sub === undefined) {
        scene.deleted.set(id, existing);
        scene.items = scene.items.filter((entry) => entry.id !== id);
        scene.version += 1;
        scene.updatedAtMs = now();
        return Response.json({ item: existing, snapshot: snapshotOf(scene) });
      }
      if (request.method === "PATCH" && sub === undefined) {
        return readJsonBody(request).then((body) => {
          const ts = now();
          return commitItem(index, { ...existing, ...(body as Partial<FakeReminderItem>), id: existing.id, revision: existing.revision + 1, updatedAtMs: ts }, ts);
        });
      }
      if (request.method === "POST" && sub === "complete") {
        const ts = now();
        scene.deleted.set(id, existing);
        const completed: FakeReminderItem = { ...existing, completed: true, completedAtMs: ts, snoozedUntilMs: null, revision: existing.revision + 1, updatedAtMs: ts };
        scene.items[index] = completed;
        const nextDate = existing.dueDate !== null ? advanceDate(existing.dueDate, existing.recurrence) : null;
        const nextItem: FakeReminderItem | null = nextDate === null
          ? null
          : { ...existing, id: `rem-${scene.nextId++}`, dueDate: nextDate, subtasks: existing.subtasks.map((s) => ({ ...s, done: false })), completed: false, completedAtMs: null, snoozedUntilMs: null, notifiedAtMs: null, agentTaskId: null, revision: 1, createdAtMs: ts, updatedAtMs: ts };
        if (nextItem !== null) scene.items.push(nextItem);
        scene.version += 1;
        scene.updatedAtMs = ts;
        return Response.json({ item: completed, nextItem, snapshot: snapshotOf(scene) });
      }
      if (request.method === "POST" && sub === "reopen") {
        const ts = now();
        return commitItem(index, { ...existing, completed: false, completedAtMs: null, revision: existing.revision + 1, updatedAtMs: ts }, ts);
      }
      if (request.method === "POST" && sub === "snooze") {
        return readJsonBody(request).then((body) => {
          const ts = now();
          const until = typeof body.untilMs === "number" ? body.untilMs : ts + (typeof body.minutes === "number" ? body.minutes : 10) * 60_000;
          return commitItem(index, { ...existing, snoozedUntilMs: until, notifiedAtMs: null, revision: existing.revision + 1, updatedAtMs: ts }, ts);
        });
      }
      return undefined;
    },
  ];
}

/** Fake `ElizaReminders` Capacitor plugin bound to `scene`. */
export function elizaReminders(scene: RemindersScene, now: () => number): Faked {
  return () => ({
    scheduleReminder: (raw: unknown) => {
      const input = raw as AndroidReminderScheduleInput;
      const ts = now();
      const occurrenceId = `${input.id}:${input.at}`;
      const record: AndroidReminderRecord = {
        id: input.id,
        title: input.title,
        body: input.body ?? "",
        occurrenceId,
        target: { sourceId: input.id, sourceRevision: "1", reminderId: input.id, occurrenceId, revision: "1" },
        createdAt: ts,
        at: input.at,
        dueAt: input.dueAt ?? input.at,
        alertMinutes: input.alertMinutes ?? null,
        status: scene.notificationsEnabled ? "scheduled" : "permission-denied",
        mode: scene.notificationsEnabled ? "inexact" : "none",
        history: [],
      };
      scene.scheduled.set(input.id, record);
      return Promise.resolve({
        id: input.id,
        status: record.status,
        mode: record.mode,
        at: input.at,
        dueAt: record.dueAt,
        occurrenceId,
        target: record.target,
      });
    },
    cancelReminder: (raw: unknown) => {
      const input = raw as AndroidReminderCancelInput;
      const existed = scene.scheduled.delete(input.id);
      return Promise.resolve({ id: input.id, cancelled: existed });
    },
    listReminders: () => Promise.resolve({
      reminders: [...scene.scheduled.values()],
      notificationsEnabled: scene.notificationsEnabled,
    }),
    pendingReminderTap: () => Promise.resolve(scene.pendingTap === null ? { pending: false } : { pending: true, ...scene.pendingTap }),
    consumeReminderTap: (raw: unknown) => {
      const token = (raw as { token?: string }).token;
      if (scene.pendingTap?.token === token) scene.pendingTap = null;
      return Promise.resolve();
    },
    removeAllListeners: () => Promise.resolve(),
  });
}
