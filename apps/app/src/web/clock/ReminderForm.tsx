// spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/reminderDrafts.md, "Story: Find my unsaved reminder where I left it"
import { useState } from "react";
import type { ReminderDraft } from "../../clock/schedule.ts";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "../components/ui/index.ts";

/** The reminder form: where it starts, whether a draft of it is kept, and what it reports as the owner types, saves, cancels or discards. */
export type ReminderFormProps = {
  /** The draft the form starts from: a kept draft, a new reminder an hour from now, or the reminder being edited. */
  initial: ReminderDraft;
  /** A save is running; the form refuses another. */
  saving: boolean;
  /** A draft of this form is kept between visits, so it can be discarded. */
  kept: boolean;
  /** The form as the owner left it after each change, for Alpha to keep. */
  onChange: (draft: ReminderDraft) => void;
  onSave: (draft: ReminderDraft) => void;
  onCancel: () => void;
  /** Asks to discard the kept draft. */
  onDiscard: () => void;
};

const toDate = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fromDate = (value: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = value.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
};

const ALERTS: ReadonlyArray<{ value: string; label: string; minutes: number | null }> = [
  { value: "none", label: "No alert", minutes: null },
  { value: "0", label: "At time", minutes: 0 },
  { value: "5", label: "5 min before", minutes: 5 },
  { value: "15", label: "15 min before", minutes: 15 },
  { value: "60", label: "1 hour before", minutes: 60 },
];

type Fields = { title: string; body: string; date: string; time: string; repeat: ReminderDraft["repeat"]; alert: string };

const fieldsOf = (draft: ReminderDraft): Fields => ({
  title: draft.title,
  body: draft.body,
  date: toDate(draft.dayOffset),
  time: `${String(Math.floor(draft.minuteOfDay / 60)).padStart(2, "0")}:${String(draft.minuteOfDay % 60).padStart(2, "0")}`,
  repeat: draft.repeat,
  alert: draft.alertMinutes === null ? "none" : String(draft.alertMinutes),
});

const draftOfFields = (f: Fields): ReminderDraft | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time)) return undefined;
  const [hour, minute] = f.time.split(":").map(Number);
  return { title: f.title, body: f.body, dayOffset: fromDate(f.date), minuteOfDay: hour * 60 + minute, repeat: f.repeat, alertMinutes: ALERTS.find((a) => a.value === f.alert)?.minutes ?? null };
};

/** A reminder's title, notes, day, time, repeat and alert. A reminder keeps nothing else. */
export function ReminderForm({ initial, saving, kept, onChange, onSave, onCancel, onDiscard }: ReminderFormProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const current = draftOfFields(fields);
  const valid = fields.title.trim() !== "" && current !== undefined;
  const update = (patch: Partial<Fields>) => {
    const next = { ...fields, ...patch };
    setFields(next);
    const draft = draftOfFields(next);
    if (draft !== undefined) onChange(draft);
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (valid && current && !saving) onSave(current); }}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reminder-title">Title</Label>
        <Input id="reminder-title" value={fields.title} maxLength={200} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="reminder-date">Day</Label>
          <Input id="reminder-date" type="date" value={fields.date} onChange={(e) => update({ date: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="reminder-time">Time</Label>
          <Input id="reminder-time" type="time" value={fields.time} onChange={(e) => update({ time: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="reminder-repeat">Repeat</Label>
          <Select value={fields.repeat} onValueChange={(value) => update({ repeat: value as ReminderDraft["repeat"] })}>
            <SelectTrigger id="reminder-repeat"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Never</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekdays">Weekdays</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="reminder-alert">Alert</Label>
          <Select value={fields.alert} onValueChange={(value) => update({ alert: value })}>
            <SelectTrigger id="reminder-alert"><SelectValue /></SelectTrigger>
            <SelectContent>{ALERTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reminder-notes">Notes</Label>
        <Textarea id="reminder-notes" value={fields.body} maxLength={4000} onChange={(e) => update({ body: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        {kept && <Button variant="ghost" className="mr-auto text-destructive" onClick={onDiscard}>Discard</Button>}
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={!valid}>Save</Button>
      </div>
    </form>
  );
}
