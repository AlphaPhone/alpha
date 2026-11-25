// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import { randomUUID } from "node:crypto";
import { type ScheduledTasksApi, readTurnContext, scheduledTasksServiceType, showsApp } from "@elizaos/agent-host";
import {
  type AlphaAppsStore, DEFAULT_LIST_ID, addCivilDays, civilToEpochMs, normalizeListColor,
  normalizeListIcon, normalizePriority, normalizeRecurrence, parseCivilDate, todayCivilDate,
} from "./store.ts";
import {
  type AgentAction, type AgentProvider, type AgentRoute, type AgentRuntimeLike,
  type NotificationServiceLike, type ReminderItemRecord, type ReminderSubtaskRecord,
  asRecord, readBoolean, readNumber, readRawString, readString,
} from "./types.ts";

function scheduledTasksOf(runtime: AgentRuntimeLike | undefined): ScheduledTasksApi | undefined {
  const service = runtime?.getService(scheduledTasksServiceType) as unknown;
  return service !== null && typeof service === "object" && "list" in service && "create" in service
    ? (service as ScheduledTasksApi)
    : undefined;
}

function notificationsOf(runtime: AgentRuntimeLike | undefined): NotificationServiceLike | undefined {
  const service = runtime?.getService("notification") as unknown;
  return service !== null && typeof service === "object" && "notify" in service
    ? (service as NotificationServiceLike)
    : undefined;
}

async function reconcileScheduledTasks(store: AlphaAppsStore, runtime: AgentRuntimeLike | undefined, timeZone: string): Promise<void> {
  const tasksApi = scheduledTasksOf(runtime);
  if (tasksApi === undefined) return;
  try {
    const rows = await tasksApi.list({ ownerVisibleOnly: true });
    store.reconcileAgentTasks(rows, timeZone);
  } catch {
    return;
  }
}

async function mirrorDatedReminder(store: AlphaAppsStore, runtime: AgentRuntimeLike | undefined, item: ReminderItemRecord, timeZone: string): Promise<ReminderItemRecord> {
  if (item.dueDate === null || item.completed || item.agentTaskId !== null) return item;
  const tasksApi = scheduledTasksOf(runtime);
  if (tasksApi === undefined) return item;
  const fireAtMs = civilToEpochMs(item.dueDate, item.dueMinute, timeZone);
  if (fireAtMs === null) return item;
  try {
    const created = await tasksApi.create({
      kind: "personal-assistant.reminder",
      ownerVisible: true,
      promptInstructions: item.title,
      trigger: { kind: "once", atIso: new Date(fireAtMs).toISOString() },
      metadata: { title: item.title, body: item.notes, alphaReminderId: item.id, listId: item.listId, priority: item.priority },
    });
    if (created.kind === "created") {
      return store.updateItem(item.id, { agentTaskId: created.task.taskId }) ?? item;
    }
  } catch {
    return item;
  }
  return item;
}

async function notifyReminder(runtime: AgentRuntimeLike | undefined, title: string, body: string, itemId: string): Promise<void> {
  const notifier = notificationsOf(runtime);
  if (notifier === undefined) return;
  try {
    await notifier.notify({
      title, body, category: "reminder", source: "alpha-apps", groupKey: `alpha-reminder:${itemId}`,
      data: { reminderId: itemId },
    });
  } catch {
    return;
  }
}

function parseDueDateParam(params: Record<string, unknown>, nowMs: number, timeZone: string): string | null | undefined {
  if (params.dueDate === null) return null;
  const raw = readString(params, "dueDate") ?? readString(params, "due");
  if (raw === undefined) return undefined;
  const lower = raw.toLowerCase();
  const today = todayCivilDate(nowMs, timeZone);
  if (lower === "today") return today;
  if (lower === "tomorrow") return addCivilDays(today, 1);
  if (lower === "next week") return addCivilDays(today, 7);
  if (parseCivilDate(raw) !== undefined) return raw;
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return todayCivilDate(parsed, timeZone);
  return undefined;
}

function parseDueMinuteParam(params: Record<string, unknown>): number | null | undefined {
  if (params.dueMinute === null) return null;
  const num = readNumber(params, "dueMinute");
  if (num !== undefined) return Math.max(0, Math.min(1439, Math.trunc(num)));
  const timeStr = readString(params, "dueTime") ?? readString(params, "time");
  if (timeStr === undefined) return undefined;
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(timeStr);
  if (match === null) return undefined;
  let hour = Number(match[1]);
  const minute = match[2] !== undefined ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  return hour * 60 + minute;
}

function parseSubtasksParam(value: unknown): ReminderSubtaskRecord[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: ReminderSubtaskRecord[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const entry: unknown = value[i];
    if (typeof entry === "string" && entry.trim() !== "") {
      result.push({ id: `sub-${randomUUID().slice(0, 8)}`, title: entry.trim(), done: false });
    } else if (typeof entry === "object" && entry !== null) {
      const rec = asRecord(entry);
      const title = readString(rec, "title");
      if (title !== undefined) {
        result.push({ id: readString(rec, "id") ?? `sub-${randomUUID().slice(0, 8)}`, title, done: readBoolean(rec, "done") ?? false });
      }
    }
  }
  return result;
}

function resolveListId(store: AlphaAppsStore, params: Record<string, unknown>): string {
  const snapshot = store.getReminders();
  const explicitId = readString(params, "listId");
  if (explicitId !== undefined && snapshot.lists.some((list) => list.id === explicitId)) return explicitId;
  const listName = readString(params, "listName") ?? readString(params, "list");
  if (listName !== undefined) {
    const lower = listName.toLowerCase();
    const matched = snapshot.lists.find((list) => list.id.toLowerCase() === lower || list.name.toLowerCase() === lower);
    if (matched !== undefined) return matched.id;
  }
  return DEFAULT_LIST_ID;
}

function findReminderTarget(store: AlphaAppsStore, params: Record<string, unknown>): ReminderItemRecord | undefined {
  const { items } = store.getReminders();
  const id = readString(params, "id") ?? readString(params, "itemId");
  if (id !== undefined) return items.find((item) => item.id === id);
  const title = (readString(params, "title") ?? readString(params, "query"))?.toLowerCase();
  if (title !== undefined) {
    return items.find((item) => item.title.toLowerCase() === title)
      ?? items.find((item) => item.title.toLowerCase().includes(title));
  }
  return undefined;
}

function isItemOverdue(item: ReminderItemRecord, nowMs: number, timeZone: string): boolean {
  if (item.completed || item.dueDate === null) return false;
  const today = todayCivilDate(nowMs, timeZone);
  if (item.dueDate < today) return true;
  if (item.dueDate > today || item.dueMinute === null) return false;
  const dueMs = civilToEpochMs(item.dueDate, item.dueMinute, timeZone);
  return dueMs !== null && dueMs < nowMs;
}

function formatDueSummary(item: ReminderItemRecord): string {
  if (item.dueDate === null) return "";
  if (item.dueMinute === null) return ` due ${item.dueDate}`;
  const hour = Math.floor(item.dueMinute / 60);
  const minute = item.dueMinute % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return ` due ${item.dueDate} ${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function queryReminders(store: AlphaAppsStore, params: Record<string, unknown>, timeZone: string): readonly ReminderItemRecord[] {
  const snapshot = store.getReminders();
  const nowMs = store.now();
  const today = todayCivilDate(nowMs, timeZone);
  const view = (readString(params, "view") ?? readString(params, "filter") ?? "all").toLowerCase();
  const search = readString(params, "query")?.toLowerCase();
  const listName = readString(params, "listId") ?? readString(params, "list") ?? readString(params, "listName");
  const matchedList = listName === undefined
    ? undefined
    : snapshot.lists.find((l) => l.id === listName || l.name.toLowerCase() === listName.toLowerCase());
  return snapshot.items.filter((item) => {
    if (matchedList !== undefined && item.listId !== matchedList.id) return false;
    if (search !== undefined && !item.title.toLowerCase().includes(search) && !item.notes.toLowerCase().includes(search)) return false;
    if (view === "completed") return item.completed;
    if (item.completed) return false;
    if (view === "overdue") return isItemOverdue(item, nowMs, timeZone);
    if (view === "today") return item.dueDate === today || isItemOverdue(item, nowMs, timeZone);
    if (view === "scheduled") return item.dueDate !== null;
    if (view === "flagged") return item.flagged;
    return true;
  });
}

function handleListOp(store: AlphaAppsStore, op: string, params: Record<string, unknown>) {
  if (op === "create_list") {
    const name = readString(params, "name") ?? readString(params, "listName") ?? readString(params, "title");
    if (name === undefined) return { success: false, text: "Please provide a name for the new reminder list." };
    const list = store.createList({ name, color: normalizeListColor(params.color), icon: normalizeListIcon(params.icon) });
    return { success: true, text: `Created list "${list.name}".`, data: { op, list } };
  }
  const targetId = resolveListId(store, params);
  if (op === "rename_list") {
    const name = readString(params, "newName") ?? readString(params, "name");
    if (name === undefined) return { success: false, text: "Please provide the new list name." };
    const updated = store.updateList(targetId, { name, color: params.color === undefined ? undefined : normalizeListColor(params.color), icon: params.icon === undefined ? undefined : normalizeListIcon(params.icon) });
    if (updated === undefined) return { success: false, text: "Reminder list not found." };
    return { success: true, text: `Renamed list to "${updated.name}".`, data: { op, list: updated } };
  }
  const mode = readString(params, "mode") === "cascade" ? "cascade" : "reassign";
  const removed = store.deleteList(targetId, mode);
  if (removed === undefined) return { success: false, text: "Cannot delete that reminder list." };
  return { success: true, text: `Deleted list "${removed.name}".`, data: { op, list: removed } };
}

async function handleRemindersManage(
  store: AlphaAppsStore, runtime: AgentRuntimeLike | undefined, timeZone: string,
  params: Record<string, unknown>, text: string,
) {
  await reconcileScheduledTasks(store, runtime, timeZone);
  const op = (readString(params, "op") ?? readString(params, "action") ?? "list").toLowerCase();
  if (op === "create_list" || op === "rename_list" || op === "delete_list") return handleListOp(store, op, params);
  if (op === "list" || op === "query") {
    const items = queryReminders(store, params, timeZone);
    const lines = items.map((item) => `- ${item.title}${formatDueSummary(item)}${item.flagged ? " [flagged]" : ""}${item.priority !== "none" ? ` [${item.priority}]` : ""} (${item.id})`);
    return { success: true, text: lines.length === 0 ? "No matching reminders." : `Reminders:\n${lines.join("\n")}`, data: { op, items, lists: store.getReminders().lists } };
  }
  if (op === "create") {
    const title = readString(params, "title") ?? text.trim();
    if (title === "") return { success: false, text: "Please specify a title for the reminder." };
    const created = store.createItem({
      listId: resolveListId(store, params),
      title,
      notes: readRawString(params, "notes") ?? "",
      dueDate: parseDueDateParam(params, store.now(), timeZone) ?? null,
      dueMinute: parseDueMinuteParam(params) ?? null,
      alertMinutes: readNumber(params, "alertMinutes") ?? null,
      recurrence: normalizeRecurrence(params.recurrence),
      priority: normalizePriority(params.priority),
      flagged: readBoolean(params, "flagged") ?? false,
      subtasks: parseSubtasksParam(params.subtasks) ?? [],
    });
    const mirrored = await mirrorDatedReminder(store, runtime, created, timeZone);
    return { success: true, text: `Added reminder "${mirrored.title}"${formatDueSummary(mirrored)}.`, data: { op, item: mirrored } };
  }
  const target = findReminderTarget(store, params);
  if (target === undefined) return { success: false, text: "No matching reminder found." };
  if (op === "complete") {
    const completed = store.completeItem(target.id);
    if (completed === undefined) return { success: false, text: "Reminder not found." };
    const nextItem = completed.nextItem === null ? null : await mirrorDatedReminder(store, runtime, completed.nextItem, timeZone);
    return {
      success: true,
      text: nextItem === null ? `Completed "${target.title}".` : `Completed "${target.title}" and scheduled next occurrence on ${nextItem.dueDate}.`,
      data: { op, item: completed.item, nextItem },
    };
  }
  if (op === "reopen") {
    const reopened = store.reopenItem(target.id);
    return { success: true, text: `Reopened "${target.title}".`, data: { op, item: reopened } };
  }
  if (op === "snooze") {
    const snoozed = store.snoozeItem(target.id, { minutes: readNumber(params, "minutes") ?? 10, untilMs: readNumber(params, "untilMs") });
    if (snoozed !== undefined) await notifyReminder(runtime, `Snoozed: ${snoozed.title}`, "Reminder snoozed.", snoozed.id);
    return { success: true, text: `Snoozed "${target.title}".`, data: { op, item: snoozed } };
  }
  if (op === "flag") {
    const flagged = readBoolean(params, "flagged") ?? !target.flagged;
    const updated = store.updateItem(target.id, { flagged });
    return { success: true, text: `${flagged ? "Flagged" : "Unflagged"} "${target.title}".`, data: { op, item: updated } };
  }
  if (op === "move") {
    const listId = resolveListId(store, params);
    const updated = store.updateItem(target.id, { listId });
    return { success: true, text: `Moved "${target.title}" to list ${listId}.`, data: { op, item: updated } };
  }
  if (op === "delete") {
    const removed = store.deleteItem(target.id);
    return { success: true, text: `Deleted reminder "${target.title}".`, data: { op, item: removed } };
  }
  if (op === "add_subtask") {
    const subTitle = readString(params, "subtaskTitle") ?? readString(params, "subtask");
    if (subTitle === undefined) return { success: false, text: "Please specify a subtask title." };
    const subtasks = [...target.subtasks, { id: `sub-${randomUUID().slice(0, 8)}`, title: subTitle, done: false }];
    const updated = store.updateItem(target.id, { subtasks });
    return { success: true, text: `Added subtask "${subTitle}" to "${target.title}".`, data: { op, item: updated } };
  }
  if (op === "toggle_subtask") {
    const subId = readString(params, "subtaskId");
    const subTitle = readString(params, "subtaskTitle")?.toLowerCase();
    const subtasks = target.subtasks.map((sub) =>
      sub.id === subId || (subTitle !== undefined && sub.title.toLowerCase().includes(subTitle)) ? { ...sub, done: !sub.done } : sub);
    const updated = store.updateItem(target.id, { subtasks });
    return { success: true, text: `Updated subtask on "${target.title}".`, data: { op, item: updated } };
  }
  const updated = store.updateItem(target.id, {
    title: readString(params, "newTitle") ?? (op === "update" ? readString(params, "title") : undefined),
    notes: readRawString(params, "notes"),
    dueDate: parseDueDateParam(params, store.now(), timeZone),
    dueMinute: parseDueMinuteParam(params),
    alertMinutes: params.alertMinutes === null ? null : readNumber(params, "alertMinutes"),
    recurrence: params.recurrence === undefined ? undefined : normalizeRecurrence(params.recurrence, target.recurrence),
    priority: params.priority === undefined ? undefined : normalizePriority(params.priority, target.priority),
    flagged: readBoolean(params, "flagged"),
    listId: params.listId !== undefined || params.listName !== undefined ? resolveListId(store, params) : undefined,
    subtasks: parseSubtasksParam(params.subtasks),
  });
  const mirrored = updated !== undefined ? await mirrorDatedReminder(store, runtime, updated, timeZone) : undefined;
  return { success: true, text: `Updated reminder "${mirrored?.title ?? target.title}".`, data: { op, item: mirrored } };
}

/** Alpha Reminders umbrella action (`REMINDERS_MANAGE`) bound to the shared store and runtime services. */
export function remindersAction(store: AlphaAppsStore, timeZone: string): AgentAction {
  const action: AgentAction = {
    name: "REMINDERS_MANAGE",
    similes: ["MANAGE_REMINDERS", "ALPHA_REMINDERS", "REMINDER_LISTS"],
    description: "Create, list, query, update, complete, reopen, snooze, reschedule, flag, move, delete reminders, manage custom lists, and add/toggle subtasks in Alpha Reminders.",
    parameters: [
      {
        name: "op", description: "What to do: list or query reminders, create, update, complete, reopen, snooze, flag, move or delete one, add or toggle a subtask, or create, rename or delete a list.", required: true,
        schema: { type: "string", enum: ["list", "query", "create", "update", "complete", "reopen", "snooze", "flag", "move", "delete", "add_subtask", "toggle_subtask", "create_list", "rename_list", "delete_list"] },
      },
      { name: "title", description: "The reminder's title to create one; for other operations, the title of the reminder to act on.", required: false, schema: { type: "string" } },
      { name: "id", description: "The reminder's id, as the Reminders context lists it, to act on one reminder.", required: false, schema: { type: "string" } },
      { name: "newTitle", description: "A new title for update.", required: false, schema: { type: "string" } },
      { name: "notes", description: "The reminder's notes.", required: false, schema: { type: "string" } },
      { name: "dueDate", description: "The day it is due, as YYYY-MM-DD in the owner's time zone.", required: false, schema: { type: "string" } },
      { name: "dueMinute", description: "The time it is due, as minutes after midnight in the owner's time zone (6 PM is 1080).", required: false, schema: { type: "number", minimum: 0, maximum: 1439 } },
      { name: "recurrence", description: "How it repeats.", required: false, schema: { type: "string", enum: ["none", "daily", "weekdays", "weekly", "monthly", "yearly"] } },
      { name: "priority", description: "Its priority.", required: false, schema: { type: "string", enum: ["none", "low", "medium", "high"] } },
      { name: "flagged", description: "Whether it is flagged.", required: false, schema: { type: "boolean" } },
      { name: "listName", description: "The list to put it in, show, or move it to; for create_list or rename_list use name.", required: false, schema: { type: "string" } },
      { name: "name", description: "A list's name for create_list, or its new name for rename_list.", required: false, schema: { type: "string" } },
      { name: "view", description: "Which reminders to list.", required: false, schema: { type: "string", enum: ["all", "today", "scheduled", "flagged", "overdue", "completed"] } },
      { name: "query", description: "Text to search reminder titles and notes for.", required: false, schema: { type: "string" } },
      { name: "minutes", description: "Minutes to snooze for.", required: false, schema: { type: "number", minimum: 1 } },
      { name: "subtaskTitle", description: "A subtask's title, to add or toggle it.", required: false, schema: { type: "string" } },
    ],
    validate: () => Promise.resolve(true),
    handler: async (runtime, message, _state, options) => {
      const params = asRecord(asRecord(options).parameters ?? asRecord(options));
      const text = readRawString(asRecord(message.content), "text") ?? "";
      return handleRemindersManage(store, runtime, timeZone, params, text);
    },
  };
  showsApp(action, "reminders");
  return action;
}

/** Alpha Reminders context provider injecting overdue, today, flagged, custom list counts, and selected reminder context. */
export function remindersProvider(store: AlphaAppsStore, timeZone: string): AgentProvider {
  return {
    name: "ALPHA_REMINDERS_SUMMARY",
    description: "Overdue and due-today reminders, flagged items, custom reminder lists, and currently selected reminder context.",
    dynamic: true,
    get: async (runtime, message) => {
      await reconcileScheduledTasks(store, runtime, timeZone);
      const nowMs = store.now();
      const today = todayCivilDate(nowMs, timeZone);
      const snapshot = store.getReminders();
      const open = snapshot.items.filter((item) => !item.completed);
      const overdue = open.filter((item) => isItemOverdue(item, nowMs, timeZone));
      const dueToday = open.filter((item) => item.dueDate === today && !isItemOverdue(item, nowMs, timeZone));
      const flagged = open.filter((item) => item.flagged);
      const lines: string[] = [
        "# Alpha Reminders",
        `Open: ${open.length} | Overdue: ${overdue.length} | Due today: ${dueToday.length} | Flagged: ${flagged.length}`,
      ];
      if (overdue.length > 0) {
        lines.push("## Overdue");
        for (const item of overdue.slice(0, 8)) lines.push(`- [${item.id}] ${item.title}${formatDueSummary(item)}`);
      }
      if (dueToday.length > 0) {
        lines.push("## Due today");
        for (const item of dueToday.slice(0, 8)) lines.push(`- [${item.id}] ${item.title}${formatDueSummary(item)}`);
      }
      lines.push("## Lists");
      for (const list of snapshot.lists) {
        const count = open.filter((item) => item.listId === list.id).length;
        lines.push(`- ${list.name} [${list.id}]: ${count} open`);
      }
      const turn = readTurnContext(message);
      const selected = asRecord(asRecord(turn?.observation).selectedObject);
      const selectedId = readString(selected, "id");
      const selectedItem = selectedId === undefined ? undefined : snapshot.items.find((item) => item.id === selectedId);
      if (selectedItem !== undefined) {
        lines.push(`Selected reminder: [${selectedItem.id}] ${selectedItem.title}${formatDueSummary(selectedItem)}`);
      }
      return {
        text: lines.join("\n"),
        values: {
          openCount: open.length,
          overdueCount: overdue.length,
          dueTodayCount: dueToday.length,
          flaggedCount: flagged.length,
          listCount: snapshot.lists.length,
        },
        data: { snapshot, selectedId: selectedItem?.id ?? null },
      };
    },
  };
}

/** HTTP routes under `/api/alpha/reminders` for bidirectional sync between Alpha Reminders UI and the resident agent. */
export function remindersRoutes(store: AlphaAppsStore, runtime: AgentRuntimeLike | undefined, timeZone: string): AgentRoute[] {
  return [
    {
      method: "GET",
      path: "/api/alpha/reminders",
      handler: async () => {
        await reconcileScheduledTasks(store, runtime, timeZone);
        return { status: 200, body: store.getReminders() };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/lists",
      handler: (input) => {
        const body = asRecord(input.body);
        const name = readString(body, "name");
        if (name === undefined) return { status: 400, body: { error: "invalid_list_name" } };
        const list = store.createList({
          id: readString(body, "id"),
          name,
          color: normalizeListColor(body.color),
          icon: normalizeListIcon(body.icon),
        });
        return { status: 201, body: { list, snapshot: store.getReminders() } };
      },
    },
    {
      method: "PATCH",
      path: "/api/alpha/reminders/lists/{id}",
      handler: (input) => {
        const body = asRecord(input.body);
        const updated = store.updateList(input.parameters.get("id") ?? "", {
          name: readString(body, "name"),
          color: body.color === undefined ? undefined : normalizeListColor(body.color),
          icon: body.icon === undefined ? undefined : normalizeListIcon(body.icon),
        });
        if (updated === undefined) return { status: 404, body: { error: "reminder_list_not_found" } };
        return { status: 200, body: { list: updated, snapshot: store.getReminders() } };
      },
    },
    {
      method: "DELETE",
      path: "/api/alpha/reminders/lists/{id}",
      handler: (input) => {
        const mode = input.query.get("mode") === "cascade" || readString(asRecord(input.body), "mode") === "cascade" ? "cascade" : "reassign";
        const removed = store.deleteList(input.parameters.get("id") ?? "", mode);
        if (removed === undefined) return { status: 404, body: { error: "reminder_list_not_found" } };
        return { status: 200, body: { list: removed, snapshot: store.getReminders() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/items",
      handler: async (input) => {
        const body = asRecord(input.body);
        const title = readString(body, "title");
        if (title === undefined) return { status: 400, body: { error: "invalid_reminder_title" } };
        const created = store.createItem({
          id: readString(body, "id"),
          listId: readString(body, "listId"),
          title,
          notes: readRawString(body, "notes") ?? "",
          dueDate: parseDueDateParam(body, store.now(), timeZone) ?? null,
          dueMinute: parseDueMinuteParam(body) ?? null,
          alertMinutes: body.alertMinutes === null ? null : readNumber(body, "alertMinutes") ?? null,
          recurrence: normalizeRecurrence(body.recurrence),
          priority: normalizePriority(body.priority),
          flagged: readBoolean(body, "flagged") ?? false,
          subtasks: parseSubtasksParam(body.subtasks) ?? [],
          agentTaskId: readString(body, "agentTaskId") ?? null,
        });
        const item = await mirrorDatedReminder(store, runtime, created, timeZone);
        return { status: 201, body: { item, snapshot: store.getReminders() } };
      },
    },
    {
      method: "PATCH",
      path: "/api/alpha/reminders/items/{id}",
      handler: async (input) => {
        const body = asRecord(input.body);
        const updated = store.updateItem(input.parameters.get("id") ?? "", {
          listId: readString(body, "listId"),
          title: readString(body, "title"),
          notes: readRawString(body, "notes"),
          dueDate: parseDueDateParam(body, store.now(), timeZone),
          dueMinute: parseDueMinuteParam(body),
          alertMinutes: body.alertMinutes === null ? null : readNumber(body, "alertMinutes"),
          recurrence: body.recurrence === undefined ? undefined : normalizeRecurrence(body.recurrence),
          priority: body.priority === undefined ? undefined : normalizePriority(body.priority),
          flagged: readBoolean(body, "flagged"),
          subtasks: parseSubtasksParam(body.subtasks),
          completed: readBoolean(body, "completed"),
          snoozedUntilMs: body.snoozedUntilMs === null ? null : readNumber(body, "snoozedUntilMs"),
          notifiedAtMs: body.notifiedAtMs === null ? null : readNumber(body, "notifiedAtMs"),
        });
        if (updated === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        const item = await mirrorDatedReminder(store, runtime, updated, timeZone);
        return { status: 200, body: { item, snapshot: store.getReminders() } };
      },
    },
    {
      method: "DELETE",
      path: "/api/alpha/reminders/items/{id}",
      handler: (input) => {
        const removed = store.deleteItem(input.parameters.get("id") ?? "");
        if (removed === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        return { status: 200, body: { item: removed, snapshot: store.getReminders() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/items/{id}/complete",
      handler: async (input) => {
        const result = store.completeItem(input.parameters.get("id") ?? "");
        if (result === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        const nextItem = result.nextItem === null ? null : await mirrorDatedReminder(store, runtime, result.nextItem, timeZone);
        return { status: 200, body: { item: result.item, nextItem, snapshot: store.getReminders() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/items/{id}/reopen",
      handler: (input) => {
        const item = store.reopenItem(input.parameters.get("id") ?? "");
        if (item === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        return { status: 200, body: { item, snapshot: store.getReminders() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/items/{id}/snooze",
      handler: async (input) => {
        const body = asRecord(input.body);
        const item = store.snoozeItem(input.parameters.get("id") ?? "", {
          minutes: readNumber(body, "minutes"),
          untilMs: readNumber(body, "untilMs") ?? readNumber(body, "snoozedUntilMs"),
        });
        if (item === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        await notifyReminder(runtime, `Snoozed: ${item.title}`, "Reminder snoozed.", item.id);
        return { status: 200, body: { item, snapshot: store.getReminders() } };
      },
    },
    {
      method: "POST",
      path: "/api/alpha/reminders/items/{id}/restore",
      handler: (input) => {
        const body = asRecord(input.body);
        const fallback = typeof body.item === "object" && body.item !== null ? (body.item as ReminderItemRecord) : undefined;
        const item = store.restoreItem(input.parameters.get("id") ?? "", fallback);
        if (item === undefined) return { status: 404, body: { error: "reminder_not_found" } };
        return { status: 200, body: { item, snapshot: store.getReminders() } };
      },
    },
  ];
}
