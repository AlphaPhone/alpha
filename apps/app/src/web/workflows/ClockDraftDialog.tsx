// spec/workflows/clockDraft.md, "Story: Set an alarm a workflow suggests, from Workflows"; spec/workflows/clockDraft.md, "The alarm the owner sets in the draft reaches Clock's review exactly: a real time, a short label and distinct days"
import { useState } from "react";
import { alarmLabelLimit, validAlarm } from "../../../gen/workflows__clockDraft.ts";
import type { AlarmRequest } from "../../workflows/ports.vibe";
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, Toggle } from "../components/ui/index.ts";

const DAYS: ReadonlyArray<{ readonly day: number; readonly short: string; readonly name: string }> = [
  { day: 2, short: "M", name: "Monday" }, { day: 3, short: "T", name: "Tuesday" }, { day: 4, short: "W", name: "Wednesday" },
  { day: 5, short: "T", name: "Thursday" }, { day: 6, short: "F", name: "Friday" }, { day: 7, short: "S", name: "Saturday" }, { day: 1, short: "S", name: "Sunday" },
];

/** The Clock draft over Workflows: the alarm the owner sets, then Clock's exact review before Clock opens. */
export interface ClockDraftDialogProps {
  /** Whether the draft is open over Workflows. */
  shown: boolean;
  /** Whether Clock's review of the prepared alarm shows. */
  review: boolean;
  /** Whether the reviewed alarm may be handed to Clock now. */
  canApprove: boolean;
  /** The alarm the draft starts from. */
  start?: AlarmRequest;
  onPrepare: (request: AlarmRequest) => void;
  onApprove: () => void;
  onCancel: () => void;
}

function wall(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Set an alarm's time, label and repeat days, review exactly what Clock receives, and open Clock once.
 * @model spec/workflows/clockDraft.md
 * @design design.md
 */
export function ClockDraftDialog({ shown, review, canApprove, start, onPrepare, onApprove, onCancel }: ClockDraftDialogProps) {
  const [time, setTime] = useState(() => wall(start?.hour ?? 7, start?.minute ?? 0));
  const [label, setLabel] = useState(start?.label ?? "");
  const [days, setDays] = useState<ReadonlyArray<number>>(start?.days ?? []);
  const [hour, minute] = time.split(":").map(Number);
  const request: AlarmRequest = { hour: hour ?? -1, minute: minute ?? -1, label, days };
  const valid = Number.isInteger(request.hour) && Number.isInteger(request.minute) && validAlarm(request.hour, request.minute, label.trim().length, [...days]);
  const repeat = DAYS.filter((d) => days.includes(d.day)).map((d) => d.name).join(", ");
  return (
    <Dialog open={shown} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent closeLabel="Cancel">
        <DialogTitle>{review ? "Set this alarm in Clock?" : "Alarm in Clock"}</DialogTitle>
        {review ? (
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl">{time}</p>
            <p className="text-sm">{label.trim() === "" ? "No label" : label.trim()} · {repeat === "" ? "Once" : repeat}</p>
            <p className="text-sm text-muted-foreground">Clock opens with the alarm you reviewed. Clock only tells Alpha that it opened.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Label htmlFor="workflow-alarm-time">Time</Label>
            <Input id="workflow-alarm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Label htmlFor="workflow-alarm-label">Label</Label>
            <Input id="workflow-alarm-label" value={label} maxLength={alarmLabelLimit} onChange={(e) => setLabel(e.target.value)} />
            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono text-xs uppercase text-muted-foreground">Repeat</legend>
              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <Toggle key={d.day} className="size-10" aria-label={d.name} pressed={days.includes(d.day)}
                    onPressedChange={(on) => setDays((was) => (on ? [...was.filter((x) => x !== d.day), d.day] : was.filter((x) => x !== d.day)))}>
                    {d.short}
                  </Toggle>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={onCancel}>Cancel</Button>
          {review
            ? <Button size="lg" disabled={!canApprove} onClick={onApprove}>Open Clock</Button>
            : <Button size="lg" disabled={!valid} onClick={() => onPrepare(request)}>Review</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
