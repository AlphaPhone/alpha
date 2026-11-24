// spec/clock/handoff.md, "Story: Ask Clock for an alarm after I review it"; spec/clock/handoff.md, "Story: Try the Clock screen without opening Clock"; spec/clock/handoffHistory.md, "Story: Know what became of my last Clock request after a restart"
import { useState } from "react";
import { AlarmClock, BellOff, ExternalLink, TimerReset } from "lucide-react";
import type { Event, Handoff } from "../../../gen/clock__handoff.ts";
import type { HandoffAction, HandoffStatus } from "../../../gen/clock__vocabulary.ts";
import { testMocksBuilt } from "../../platform/build-flags.ts";
import { Alert, Button, Card, CardFooter, Input, Label, Switch, Tabs, TabsList, TabsTrigger } from "../components/ui/index.ts";
import { DayPicker } from "./DayPicker.tsx";
import { describeHandoff, handoffMessage, lastHandoff, wall } from "./text.ts";

/** The Clock handoff draft, its review and dispatch, the phone's time zone and Clock's last answer. */
export type HandoffPanelProps = {
  /** The draft, its review and its dispatch. */
  handoff: Handoff;
  /** The phone's time zone now. */
  zone: string;
  /** What the latest handoff recorded, shown after a restart. */
  lastStatus?: HandoffStatus;
  /** Whether the rules allow an event now. */
  can: (event: Event) => boolean;
  /** Sends a draft change. */
  send: (event: Event) => void;
  /** Shows the exact request for review. */
  onPrepare: () => void;
  /** Records and sends the reviewed request. */
  onConfirm: () => void;
};

const ACTIONS: ReadonlyArray<{ value: HandoffAction; label: string; Icon: typeof AlarmClock }> = [
  { value: "SetAlarm", label: "Set", Icon: AlarmClock },
  { value: "ShowAlarms", label: "Alarms", Icon: ExternalLink },
  { value: "SnoozeAlarm", label: "Snooze", Icon: TimerReset },
  { value: "DismissAlarm", label: "Dismiss", Icon: BellOff },
];

/**
 * The Clock screen's request to Android Clock, reviewed before it is sent.
 * @model spec/clock/handoff.md
 */
export function HandoffPanel({ handoff, zone, lastStatus, can, send, onPrepare, onConfirm }: HandoffPanelProps) {
  const [time, setTime] = useState(wall(handoff.hour, handoff.minute));
  const busy = handoff.phase === "Saving" || handoff.phase === "Opening";
  const message = handoffMessage(handoff.message) || (lastStatus && handoff.settled === 0 && lastStatus !== "ClockOpened" ? lastHandoff(lastStatus) : "");
  const changeTime = (value: string) => {
    setTime(value);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return;
    const [hour, minute] = value.split(":").map(Number);
    send({ type: "setTime", hour, minute });
  };
  return (
    <section className="flex flex-col gap-6" aria-busy={busy || undefined}>
      <Tabs value={handoff.handoffAction} onValueChange={(value) => send({ type: "chooseAction", handoffAction: value as HandoffAction })}>
        <TabsList aria-label="Clock action">
          {ACTIONS.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} disabled={busy}><Icon aria-hidden className="mr-1 inline size-4" />{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {handoff.handoffAction === "SetAlarm" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="handoff-time">Time</Label>
              <Input id="handoff-time" type="time" value={time} disabled={busy} onChange={(e) => changeTime(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="handoff-label">Label</Label>
              <Input id="handoff-label" maxLength={200} value={handoff.label} disabled={busy} onChange={(e) => send({ type: "setLabel", label: e.target.value })} />
            </div>
          </div>
          {(handoff.repeatSupported || handoff.days.length > 0) && (
            <DayPicker days={handoff.days} disabled={busy} onChange={(days) => {
              const changed = [...new Set([...days, ...handoff.days])].find((d) => days.includes(d) !== handoff.days.includes(d));
              if (changed !== undefined) send({ type: "toggleDay", day: changed });
            }} />
          )}
        </div>
      )}
      {handoff.handoffAction === "SnoozeAlarm" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="handoff-snooze">Snooze (min)</Label>
          <Input id="handoff-snooze" type="number" min={1} max={60} value={handoff.snooze} disabled={busy}
            onChange={(e) => { const minutes = Number(e.target.value); if (can({ type: "setSnooze", snooze: minutes })) send({ type: "setSnooze", snooze: minutes }); }} />
        </div>
      )}
      {testMocksBuilt && handoff.mocks && (
        <div className="flex items-center justify-between">
          <Label htmlFor="handoff-simulate">Simulate</Label>
          <Switch id="handoff-simulate" checked={handoff.simulated} disabled={!can({ type: "simulate", on: !handoff.simulated })} onCheckedChange={(on) => send({ type: "simulate", on })} />
        </div>
      )}
      {handoff.phase === "Reviewing" ? (
        <Card>
          <p>{describeHandoff(handoff, handoff.reviewedZone || zone)}</p>
          <CardFooter>
            <Button variant="ghost" onClick={() => send({ type: "cancelReview" })}>Cancel</Button>
            <Button disabled={!can({ type: "confirm", zone })} onClick={onConfirm}>{testMocksBuilt && handoff.simulated ? "Simulate Clock request" : "Open Clock"}</Button>
          </CardFooter>
        </Card>
      ) : (
        <Button loading={busy} disabled={!can({ type: "prepare", zone })} onClick={onPrepare}>Review</Button>
      )}
      {message && <Alert role="status">{message}</Alert>}
    </section>
  );
}
