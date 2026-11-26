// spec/app/reminders/editor.md, "Story: Create and edit a reminder safely"
import type { ReminderListRecord, ReminderPriority, ReminderRecurrence, ReminderSubtaskRecord } from "@repo/launcher-records";
import { Alert, Button, Checkbox, Chip, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, Sheet, SheetContent, Switch, Textarea } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import type * as KeyValueStore from "effect/persistence/KeyValueStore";
import { Plus, Trash2, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type * as Editor from "../../gen/app__reminders__editor.effect.vibe";
import { useMachine as useEditorMachine } from "../../gen/app__reminders__editor.react.ts";
import { closeReminderEditor, keepMineReminderDraft, takeSavedReminderDraft, updateEditorDraft } from "./editor.vibe";
import { inputTimeToMinute, minuteToInputTime, quickDatePresets } from "./recurrence.ts";
import { EditorDraftShelf, type ReminderEditorFields, RemindersNowShelf, type RemindersShelf } from "./shelf.vibe";

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

function parseRecurrence(value: string): ReminderRecurrence | undefined {
  return RECURRENCE_OPTIONS.find((opt) => opt.value === value)?.value;
}

function LabeledSelect({
  id,
  label,
  ariaLabel,
  value,
  disabled,
  options,
  onValueChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
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

function DueScheduleCard({
  fields,
  canEdit,
  presets,
  onPatch,
}: {
  readonly fields: ReminderEditorFields;
  readonly canEdit: boolean;
  readonly presets: ReturnType<typeof quickDatePresets>;
  readonly onPatch: (patch: Partial<ReminderEditorFields>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-tile border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="reminder-due-date-toggle">Due date</Label>
        <Switch
          id="reminder-due-date-toggle"
          disabled={!canEdit}
          checked={fields.dueDate !== null}
          onCheckedChange={(checked) => onPatch({
            dueDate: checked ? (fields.dueDate ?? presets.today) : null,
            dueMinute: checked ? fields.dueMinute : null,
            recurrence: checked ? fields.recurrence : "none",
            alertMinutes: checked ? (fields.alertMinutes ?? 0) : null,
          })}
        />
      </div>

      {fields.dueDate !== null ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Chip disabled={!canEdit} pressed={fields.dueDate === presets.today} onPressedChange={() => onPatch({ dueDate: presets.today })}>Today</Chip>
            <Chip disabled={!canEdit} pressed={fields.dueDate === presets.tomorrow} onPressedChange={() => onPatch({ dueDate: presets.tomorrow })}>Tomorrow</Chip>
            <Chip disabled={!canEdit} pressed={fields.dueDate === presets.weekend} onPressedChange={() => onPatch({ dueDate: presets.weekend })}>Weekend</Chip>
            <Chip disabled={!canEdit} pressed={fields.dueDate === presets.nextWeek} onPressedChange={() => onPatch({ dueDate: presets.nextWeek })}>Next week</Chip>
          </div>
          <Input
            type="date"
            aria-label="Due date"
            disabled={!canEdit}
            value={fields.dueDate}
            onChange={(event) => onPatch({ dueDate: event.target.value || null })}
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <Label htmlFor="reminder-due-time-toggle">Due time</Label>
            <Switch
              id="reminder-due-time-toggle"
              disabled={!canEdit}
              checked={fields.dueMinute !== null}
              onCheckedChange={(checked) => onPatch({ dueMinute: checked ? (fields.dueMinute ?? 540) : null })}
            />
          </div>

          {fields.dueMinute !== null ? (
            <Input
              type="time"
              aria-label="Due time"
              disabled={!canEdit}
              value={minuteToInputTime(fields.dueMinute)}
              onChange={(event) => onPatch({ dueMinute: inputTimeToMinute(event.target.value) })}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <LabeledSelect
              id="reminder-repeat"
              label="Repeat"
              ariaLabel="Repeat"
              disabled={!canEdit}
              value={fields.recurrence}
              options={RECURRENCE_OPTIONS}
              onValueChange={(value) => {
                const parsed = parseRecurrence(value);
                if (parsed !== undefined) onPatch({ recurrence: parsed });
              }}
            />
            <LabeledSelect
              id="reminder-alert"
              label="Alert"
              ariaLabel="Alert timing"
              disabled={!canEdit}
              value={fields.alertMinutes === null ? "none" : String(fields.alertMinutes)}
              options={ALERT_OPTIONS}
              onValueChange={(value) => {
                if (value === "none") {
                  onPatch({ alertMinutes: null });
                } else {
                  const parsed = Number(value);
                  if (Number.isFinite(parsed)) onPatch({ alertMinutes: parsed });
                }
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Bottom sheet for creating or editing a reminder, backed by the persisted Editor draft machine. */
export function ReminderEditorSheet({
  runtime,
  lists,
  canDelete,
  onSave,
  onDelete,
}: {
  readonly runtime: ManagedRuntime.ManagedRuntime<Editor.Machine | EditorDraftShelf | RemindersNowShelf | RemindersShelf | KeyValueStore.KeyValueStore, unknown>;
  readonly lists: readonly ReminderListRecord[];
  readonly canDelete?: boolean;
  readonly onSave: () => void;
  readonly onDelete: (itemId: string) => void;
}) {
  const { state, can } = useEditorMachine(runtime);
  const draftShelf = runtime.runSync(Effect.map(EditorDraftShelf, (service) => service.shelf));
  const nowShelf = runtime.runSync(Effect.map(RemindersNowShelf, (service) => service.shelf));
  const fields = useSyncExternalStore(draftShelf.subscribe, draftShelf.snapshot);
  const nowMs = useSyncExternalStore(nowShelf.subscribe, nowShelf.snapshot);
  const [newSubtask, setNewSubtask] = useState("");
  if (!state || !state.open) return null;
  const presets = quickDatePresets(nowMs);
  const canEdit = can({ type: "editTitle", ok: true });
  const canClose = can({ type: "close" });
  const canSaveDraft = can({ type: "save" }) && fields.title.trim() !== "";
  const canAddSubtask = can({ type: "addSubtask" });
  const canRemoveSubtask = can({ type: "removeSubtask" });
  const conflicted = can({ type: "keepMine" }) || can({ type: "takeSaved" });

  function patch(next: Partial<ReminderEditorFields>) {
    if (!canEdit) return;
    void runtime.runPromise(updateEditorDraft(next));
  }

  function closeEditor() {
    if (!canClose) return;
    void runtime.runPromise(closeReminderEditor());
  }

  function addSubtask() {
    const trimmed = newSubtask.trim();
    if (!canAddSubtask || trimmed === "" || fields.subtasks.length >= 50) return;
    const entry: ReminderSubtaskRecord = { id: `sub_${crypto.randomUUID().slice(0, 8)}`, title: trimmed, done: false };
    patch({ subtasks: [...fields.subtasks, entry] });
    setNewSubtask("");
  }

  function toggleSubtask(subId: string) {
    patch({ subtasks: fields.subtasks.map((sub) => (sub.id === subId ? { ...sub, done: !sub.done } : sub)) });
  }

  function removeSubtask(subId: string) {
    if (!canRemoveSubtask) return;
    patch({ subtasks: fields.subtasks.filter((sub) => sub.id !== subId) });
  }

  return (
    <Sheet open onOpenChange={(next) => { if (!next) closeEditor(); }}>
      <SheetContent
        title={fields.itemId === null ? "New reminder" : "Edit reminder"}
        actions={(
          <>
            {fields.itemId !== null ? (
              <Button
                type="button"
                variant="destructive"
                disabled={!canClose || canDelete === false}
                onClick={() => {
                  const target = fields.itemId;
                  closeEditor();
                  if (target !== null) onDelete(target);
                }}
              >
                <Trash2 aria-hidden className="size-4.5" />
                Delete
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled={!canClose} onClick={closeEditor}>
                Cancel
              </Button>
            )}
            <Button type="button" disabled={!canSaveDraft} onClick={onSave}>Save</Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4 pb-2">
          {conflicted ? (
            <Alert variant="warn" role="status">
              <div className="flex flex-col gap-2">
                <p>This reminder changed elsewhere while you were editing it.</p>
                <div className="flex flex-wrap gap-2">
                  {can({ type: "keepMine" }) ? (
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      onClick={() => void runtime.runPromise(keepMineReminderDraft())}
                    >
                      Keep my changes
                    </Button>
                  ) : null}
                  {can({ type: "takeSaved" }) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-11"
                      onClick={() => void runtime.runPromise(takeSavedReminderDraft())}
                    >
                      Use saved reminder
                    </Button>
                  ) : null}
                </div>
              </div>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              aria-label="Title"
              disabled={!canEdit}
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
              disabled={!canEdit}
              value={fields.notes}
              placeholder="Add notes, links, or details…"
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-list">List</Label>
            <Select value={fields.listId} disabled={!canEdit} onValueChange={(listId) => patch({ listId })}>
              <SelectTrigger id="reminder-list" aria-label="Reminder list" placeholder="Select list" />
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DueScheduleCard fields={fields} canEdit={canEdit} presets={presets} onPatch={patch} />

          <div className="flex flex-col gap-2">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  disabled={!canEdit}
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
              disabled={!canEdit}
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
                      disabled={!canEdit}
                      checked={sub.done}
                      aria-label={`Toggle subtask ${sub.title}`}
                      onCheckedChange={() => toggleSubtask(sub.id)}
                    />
                    <span className={sub.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm text-foreground"}>
                      {sub.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canRemoveSubtask}
                      aria-label={`Remove subtask ${sub.title}`}
                      onClick={() => removeSubtask(sub.id)}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                id="reminder-subtask-input"
                disabled={!canAddSubtask}
                value={newSubtask}
                placeholder="Add subtask…"
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSubtask(); } }}
              />
              <Button type="button" variant="secondary" size="sm" className="min-h-11" aria-label="Add subtask" disabled={!canAddSubtask || newSubtask.trim() === ""} onClick={addSubtask}>
                <Plus aria-hidden className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
