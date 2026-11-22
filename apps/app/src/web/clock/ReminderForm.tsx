// spec/clock/reminders.md, "Story: Change a reminder exactly once"
import { useState } from "react";
import type { ReminderDraft } from "../../clock/schedule.ts";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "../components/ui/index.ts";

export type ReminderFormProps = {
  /** The draft the form starts from: a new reminder an hour from now, or the reminder being edited. */
  initial: ReminderDraft;
  /** A save is running; the form refuses another. */
  saving: boolean;
  onSave: (draft: ReminderDraft) => void;
  onCancel: () => void;
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

/** A reminder's title, notes, day, time, repeat and alert. A reminder keeps nothing else. */
export function ReminderForm({ initial, saving, onSave, onCancel }: ReminderFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [date, setDate] = useState(toDate(initial.dayOffset));
  const [time, setTime] = useState(`${String(Math.floor(initial.minuteOfDay / 60)).padStart(2, "0")}:${String(initial.minuteOfDay % 60).padStart(2, "0")}`);
  const [repeat, setRepeat] = useState(initial.repeat);
  const [alert, setAlert] = useState(initial.alertMinutes === null ? "none" : String(initial.alertMinutes));
  const valid = title.trim() !== "" && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const save = () => {
    const [hour, minute] = time.split(":").map(Number);
    onSave({ title, body, dayOffset: fromDate(date), minuteOfDay: hour * 60 + minute, repeat, alertMinutes: ALERTS.find((a) => a.value === alert)?.minutes ?? null });
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (valid && !saving) save(); }}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reminder-title">Title</Label>
        <Input id="reminder-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="reminder-date">Day</Label>
          <Input id="reminder-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="reminder-time">Time</Label>
          <Input id="reminder-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="reminder-repeat">Repeat</Label>
          <Select value={repeat} onValueChange={(value) => setRepeat(value as ReminderDraft["repeat"])}>
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
          <Select value={alert} onValueChange={setAlert}>
            <SelectTrigger id="reminder-alert"><SelectValue /></SelectTrigger>
            <SelectContent>{ALERTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="reminder-notes">Notes</Label>
        <Textarea id="reminder-notes" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={!valid}>Save</Button>
      </div>
    </form>
  );
}
