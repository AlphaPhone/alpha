// spec/calendar/availability.md, "Story: Choose the calendars and see the answer before it is shared"
import { useState } from "react";
import { checkOffered, shownAnswer } from "../../../gen/calendar__availability.ts";
import type { RequestSheet } from "../../calendar/requests.vibe";
import { formatDateTime } from "../../calendar/time.ts";
import { Button, Checkbox, Sheet, SheetContent } from "../components/ui/index.ts";

/** The review sheet an agent request waits on, and the owner's answers to each step. */
export type AgentRequestReviewViewProps = {
  /** No review, the calendars to choose, or the answer to share. */
  sheet: RequestSheet;
  /** The ticked calendars' ids, or null to cancel. */
  onChooseCalendars: (ids: readonly string[] | null) => void;
  /** Shares the answer with the agent, or cancels. */
  onConfirmResult: (share: boolean) => void;
};

/** The owner's two steps of an availability check: which calendars may be read, then the exact answer to share. */
export function AgentRequestReviewView({ sheet, onChooseCalendars, onConfirmResult }: AgentRequestReviewViewProps) {
  const [ticked, setTicked] = useState<readonly string[]>([]);
  if (sheet.kind === "none") return null;
  if (sheet.kind === "choose-calendars") {
    const operation = sheet.operation;
    return (
      <Sheet open onOpenChange={(next) => !next && onChooseCalendars(null)}>
        <SheetContent side="bottom" title="Check availability">
          <div className="flex flex-col gap-3 px-5 pb-6">
            <p className="text-sm">{`${formatDateTime(Date.parse(operation.start), operation.timeZone)} to ${formatDateTime(Date.parse(operation.end), operation.timeZone)} (${operation.timeZone})`}</p>
            <p className="text-sm text-muted-foreground">Only ticked calendars are read</p>
            <fieldset className="flex flex-col"><legend className="font-mono text-xs uppercase tracking-widest">On phone</legend>
              {sheet.sources.map((source) => (
                <label key={source.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox checked={ticked.includes(source.id)} onCheckedChange={(checked) => setTicked(checked === true ? [...ticked, source.id] : ticked.filter((id) => id !== source.id))} />
                  {`${source.name} · ${source.account}`}
                </label>
              ))}
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onChooseCalendars(null)}>Cancel</Button>
              <Button disabled={!checkOffered(ticked.length)} onClick={() => onChooseCalendars(ticked)}>Check</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  const result = sheet.result;
  const free = shownAnswer(result.busy.length) === "ShowsFree";
  return (
    <Sheet open onOpenChange={(next) => !next && onConfirmResult(false)}>
      <SheetContent side="bottom" title={free ? "Free" : "Busy"}>
        <div className="flex flex-col gap-3 px-5 pb-6">
          <ul className="flex flex-col gap-1 text-sm">
            {result.busy.map((interval) => (
              <li key={`${interval.start}${interval.end}`}>{`${formatDateTime(Date.parse(interval.start), result.window.timeZone)} to ${formatDateTime(Date.parse(interval.end), result.window.timeZone)}${interval.allDay ? " · all day" : ""}${interval.tentative ? " · tentative" : ""}`}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{`Read from: ${sheet.chosen.map((source) => `${source.name} · ${source.account}`).join("; ")}. Shares times only.`}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onConfirmResult(false)}>Cancel</Button>
            <Button onClick={() => onConfirmResult(true)}>Share with agent</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
