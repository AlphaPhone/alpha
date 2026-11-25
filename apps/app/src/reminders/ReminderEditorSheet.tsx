// spec/app/reminders/editor.md, "Story: Create or edit a reminder with safe validation and draft recovery"
import { Button, Checkbox, Chip, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Switch, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type * as KeyValueStore from "effect/persistence/KeyValueStore";
import { Plus, Trash2, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type * as Editor from "../../gen/app__reminders__editor.effect.vibe";
import { useMachine as useEditorMachine } from "../../gen/app__reminders__editor.react.ts";
import { Time } from "../runtime/time.vibe";
import { editorDraftStore, type ReminderEditorFields, updateEditorDraft } from "./editor.vibe";
import { inputTimeToMinute, minuteToInputTime, quickDatePresets } from "./recurrence.ts";
import type { ReminderListRecord, ReminderPriority, ReminderRecurrence, ReminderSubtaskRecord } from "./store.ts";

const RECURRENCE_OPTIONS: readonly { readonly value: ReminderRecurrence; readonly label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const ALERT_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "none", label: "No alert" },
  { value: "0", label: "At due time" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
];

const PRIORITY_OPTIONS: readonly { readonly value: ReminderPriority; readonly label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function LabeledSelect({
  id,
  label,
  ariaLabel,
  value,
  options,
  onValueChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly value: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} aria-label={ariaLabel} />
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Bottom sheet for creating or editing a reminder, backed by the persisted Editor draft machine. */
export function ReminderEditorSheet({
  runtime,
  lists,
  onSave,
  onDelete,
}: {
  readonly runtime: ManagedRuntime.ManagedRuntime<Editor.Machine | Time | KeyValueStore.KeyValueStore, unknown>;
  readonly lists: readonly ReminderListRecord[];
  readonly onSave: () => void;
  readonly onDelete: (itemId: string) => void;
}) {
  const { state, can, send } = useEditorMachine(runtime);
  const fields = useSyncExternalStore((listener) => editorDraftStore.subscribe(listener), editorDraftStore.snapshot);
  const [newSubtask, setNewSubtask] = useState("");
  const nowMs = runtime.runSync(Time.use((time) => time.latest()));
  if (!state || !state.open) return null;
  const presets = quickDatePresets(nowMs);
  const todayStr = presets.today;
  const tomorrowStr = presets.tomorrow;
  const weekendStr = presets.weekend;
  const nextWeekStr = presets.nextWeek;
  const canSaveDraft = can({ type: "save" }) && fields.title.trim() !== "";

  function patch(next: Partial<ReminderEditorFields>) {
    void runtime.runPromise(updateEditorDraft(next));
  }

  function addSubtask() {
    const trimmed = newSubtask.trim();
    if (trimmed === "" || fields.subtasks.length >= 50) return;
    const entry: ReminderSubtaskRecord = { id: `sub_${fields.subtasks.length + 1}_${trimmed.length}`, title: trimmed, done: false };
    patch({ subtasks: [...fields.subtasks, entry] });
    setNewSubtask("");
  }

  function toggleSubtask(subId: string) {
    patch({ subtasks: fields.subtasks.map((sub) => (sub.id === subId ? { ...sub, done: !sub.done } : sub)) });
  }

  function removeSubtask(subId: string) {
    patch({ subtasks: fields.subtasks.filter((sub) => sub.id !== subId) });
  }

  return (
    <Sheet open onOpenChange={(next) => { if (!next && can({ type: "close" })) void send({ type: "close" }); }}>
      <SheetContent
        title={fields.itemId === null ? "New reminder" : "Edit reminder"}
        actions={(
          <>
            {fields.itemId !== null ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const target = fields.itemId;
                  if (can({ type: "close" })) void send({ type: "close" });
                  if (target !== null) onDelete(target);
                }}
              >
                <Trash2 aria-hidden className="size-4" />
                Delete
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => { if (can({ type: "close" })) void send({ type: "close" }); }}>
                Cancel
              </Button>
            )}
            <Button type="button" disabled={!canSaveDraft} onClick={onSave}>Save</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              aria-label="Title"
              value={fields.title}
              placeholder="What do you need to remember?"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-notes">Notes</Label>
            <Textarea
              id="reminder-notes"
              rows={2}
              value={fields.notes}
              placeholder="Add notes, links, or details…"
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-list">List</Label>
            <Select value={fields.listId} onValueChange={(listId) => patch({ listId })}>
              <SelectTrigger id="reminder-list" aria-label="Reminder list" placeholder="Select list" />
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 rounded-tile border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="reminder-due-date-toggle">Due date</Label>
              <Switch
                id="reminder-due-date-toggle"
                checked={fields.dueDate !== null}
                onCheckedChange={(checked) => patch({
                  dueDate: checked ? (fields.dueDate ?? todayStr) : null,
                  dueMinute: checked ? fields.dueMinute : null,
                  recurrence: checked ? fields.recurrence : "none",
                  alertMinutes: checked ? (fields.alertMinutes ?? 0) : null,
                })}
              />
            </div>

            {fields.dueDate !== null ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <Chip pressed={fields.dueDate === todayStr} onPressedChange={() => patch({ dueDate: todayStr })}>Today</Chip>
                  <Chip pressed={fields.dueDate === tomorrowStr} onPressedChange={() => patch({ dueDate: tomorrowStr })}>Tomorrow</Chip>
                  <Chip pressed={fields.dueDate === weekendStr} onPressedChange={() => patch({ dueDate: weekendStr })}>Weekend</Chip>
                  <Chip pressed={fields.dueDate === nextWeekStr} onPressedChange={() => patch({ dueDate: nextWeekStr })}>Next week</Chip>
                </div>
                <Input
                  type="date"
                  aria-label="Due date"
                  value={fields.dueDate}
                  onChange={(event) => patch({ dueDate: event.target.value || null })}
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Label htmlFor="reminder-due-time-toggle">Due time</Label>
                  <Switch
                    id="reminder-due-time-toggle"
                    checked={fields.dueMinute !== null}
                    onCheckedChange={(checked) => patch({ dueMinute: checked ? (fields.dueMinute ?? 540) : null })}
                  />
                </div>

                {fields.dueMinute !== null ? (
                  <Input
                    type="time"
                    aria-label="Due time"
                    value={minuteToInputTime(fields.dueMinute)}
                    onChange={(event) => patch({ dueMinute: inputTimeToMinute(event.target.value) })}
                  />
                ) : null}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <LabeledSelect
                    id="reminder-repeat"
                    label="Repeat"
                    ariaLabel="Repeat"
                    value={fields.recurrence}
                    options={RECURRENCE_OPTIONS}
                    onValueChange={(value) => patch({ recurrence: value as ReminderRecurrence })}
                  />
                  <LabeledSelect
                    id="reminder-alert"
                    label="Alert"
                    ariaLabel="Alert timing"
                    value={fields.alertMinutes === null ? "none" : String(fields.alertMinutes)}
                    options={ALERT_OPTIONS}
                    onValueChange={(value) => patch({ alertMinutes: value === "none" ? null : Number(value) })}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  pressed={fields.priority === opt.value}
                  onPressedChange={() => patch({ priority: opt.value })}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-tile border border-border bg-card px-3 py-2">
            <Label htmlFor="reminder-flagged-toggle">Flagged</Label>
            <Switch
              id="reminder-flagged-toggle"
              checked={fields.flagged}
              onCheckedChange={(flagged) => patch({ flagged })}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-tile border border-border bg-card p-3">
            <Label htmlFor="reminder-subtask-input">Subtasks ({fields.subtasks.length})</Label>
            {fields.subtasks.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {fields.subtasks.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={sub.done}
                      aria-label={`Toggle subtask ${sub.title}`}
                      onCheckedChange={() => toggleSubtask(sub.id)}
                    />
                    <span className={sub.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm text-foreground"}>
                      {sub.title}
                    </span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove subtask ${sub.title}`} onClick={() => removeSubtask(sub.id)}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                id="reminder-subtask-input"
                value={newSubtask}
                placeholder="Add subtask…"
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }}
              />
              <Button type="button" variant="secondary" size="sm" aria-label="Add subtask" disabled={newSubtask.trim() === ""} onClick={addSubtask}>
                <Plus aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
