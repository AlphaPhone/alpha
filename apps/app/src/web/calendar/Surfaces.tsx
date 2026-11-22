// spec/calendar/deletions.md, "Story: Undo a deletion before it is sent"; spec/calendar/approvals.md, "Story: Approve or decline a Calendar change the agent asked for"; spec/calendar/availability.md, "Story: Choose the calendars and see the answer before it is shared"; spec/calendar/preservation.md, "Story: Keep my old app calendar, read only, for each account that chose to"
import { Effect } from "effect";
import { useState } from "react";
import { approvalStatus, type ApprovalStatus } from "../../../gen/calendar__approvals.ts";
import { checkOffered, shownAnswer } from "../../../gen/calendar__availability.ts";
import { ApprovalReviews } from "../../calendar/approvals.vibe";
import { HeldDeletions } from "../../calendar/deletions.vibe";
import { LegacyCalendar } from "../../calendar/preservation.vibe";
import { AgentRequests } from "../../calendar/requests.vibe";
import { formatDateTime } from "../../calendar/time.ts";
import type { AppId } from "../app-screen.ts";
import { Button, Checkbox, Sheet, SheetContent, Toast, ToastProvider, ToastViewport } from "../components/ui/index.ts";
import { useAgentView, useApprovalSheet, useHeld, useRequestSheet } from "./hooks.ts";
import { run } from "./runtime.ts";

/**
 * The Undo notice of the newest held deletion; its window does not end while it is on screen.
 * @model spec/calendar/deletions.md
 */
export function UndoNotices(_props: { readonly open: (app: AppId, route?: string) => void }) {
  const held = useHeld();
  const waiting = held.held.find((entry) => entry.phase === "Waiting");
  return (
    <ToastProvider duration={10_000}>
      {waiting && (
        <Toast key={waiting.id} title={waiting.decline ? "Invitation declined" : "Event deleted"}
          onOpenChange={(open) => void run(HeldDeletions.use((service) => service.offered(waiting.id, open)))}
          action={{ label: "Undo", onAction: () => void run(HeldDeletions.use((service) => service.undo(waiting.id))) }} />
      )}
      <ToastViewport />
    </ToastProvider>
  );
}

const STATUS_TEXT: Readonly<Record<ApprovalStatus, string>> = {
  StatusUnavailable: "Status unavailable", StatusExpired: "Review expired", StatusAwaiting: "Awaiting your approval",
  StatusApprovalUnavailable: "Approval unavailable", StatusRetryable: "Nothing changed. Approve to try again", StatusDeclined: "Request declined",
  StatusClosed: "Review closed", StatusNotConfirmed: "Change not confirmed",
};

/**
 * The review of a Calendar change waiting for approval: exactly the fields it would apply, read again at the tap.
 * @model spec/calendar/approvals.md
 */
export function ApprovalReview(_props: { readonly open: (app: AppId, route?: string) => void }) {
  const sheet = useApprovalSheet();
  const state = sheet.state;
  if (state.phase === "ReviewIdle") return null;
  const status = sheet.answer?.text ?? (state.changedAtTap ? "Updated" : STATUS_TEXT[approvalStatus(state.found, state.verified, state.approval)]);
  const pending = state.found && state.verified && state.approval === "ApprovalPending";
  const actionable = state.found && state.verified && (state.approval === "ApprovalPending" || state.approval === "ApprovalRetryable");
  const busy = state.phase === "Rechecking" || state.phase === "Deciding" || state.phase === "ReadingRequest";
  return (
    <Sheet open onOpenChange={(next) => !next && void run(ApprovalReviews.use((service) => service.close()))}>
      <SheetContent side="bottom" title={sheet.presentation?.heading ?? "Calendar change"}>
        <div className="flex flex-col gap-3 px-5 pb-6">
          <p role="status" aria-live="polite" className="text-sm">{busy ? "Checking request…" : status}</p>
          {sheet.presentation && (
            <dl aria-label="Event details" className="grid gap-1">
              {sheet.presentation.fields.map((field) => (
                <div key={field.label}><dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{field.label}</dt><dd className="whitespace-pre-wrap text-sm">{field.value}</dd></div>
              ))}
            </dl>
          )}
          {actionable && <p className="text-sm text-muted-foreground">{sheet.presentation?.complete ? "Dates and times are shown in this phone’s time zone." : "Current event details could not be verified. Decline this request or open Calendar and review the event before trying again."}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => void run(ApprovalReviews.use((service) => service.close()))}>Close</Button>
            {pending && <Button variant="outline" disabled={busy} onClick={() => void run(ApprovalReviews.use((service) => service.choose("RejectChange")))}>Decline</Button>}
            {actionable && <Button disabled={busy || !sheet.presentation?.complete} onClick={() => void run(ApprovalReviews.use((service) => service.choose("ApproveChange")))}>Approve</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The owner's two steps of an availability check: which calendars may be read, then the exact answer to share.
 * @model spec/calendar/availability.md
 */
export function AgentRequestReview(_props: { readonly open: (app: AppId, route?: string) => void }) {
  const sheet = useRequestSheet();
  const [ticked, setTicked] = useState<readonly string[]>([]);
  if (sheet.kind === "none") return null;
  if (sheet.kind === "choose-calendars") {
    const operation = sheet.operation;
    return (
      <Sheet open onOpenChange={(next) => !next && void run(AgentRequests.use((service) => service.chooseCalendars(null)))}>
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
              <Button variant="ghost" onClick={() => void run(AgentRequests.use((service) => service.chooseCalendars(null)))}>Cancel</Button>
              <Button disabled={!checkOffered(ticked.length)} onClick={() => void run(AgentRequests.use((service) => service.chooseCalendars(ticked)))}>Check</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  const result = sheet.result;
  const free = shownAnswer(result.busy.length) === "ShowsFree";
  return (
    <Sheet open onOpenChange={(next) => !next && void run(AgentRequests.use((service) => service.confirmResult(false)))}>
      <SheetContent side="bottom" title={free ? "Free" : "Busy"}>
        <div className="flex flex-col gap-3 px-5 pb-6">
          <ul className="flex flex-col gap-1 text-sm">
            {result.busy.map((interval) => (
              <li key={`${interval.start}${interval.end}`}>{`${formatDateTime(Date.parse(interval.start), result.window.timeZone)} to ${formatDateTime(Date.parse(interval.end), result.window.timeZone)}${interval.allDay ? " · all day" : ""}${interval.tentative ? " · tentative" : ""}`}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{`Read from: ${sheet.chosen.map((source) => `${source.name} · ${source.account}`).join("; ")}. Shares times only.`}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => void run(AgentRequests.use((service) => service.confirmResult(false)))}>Cancel</Button>
            <Button onClick={() => void run(AgentRequests.use((service) => service.confirmResult(true)))}>Share with agent</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The review of the saved app calendar before the agent's Calendar starts: keep it read only, for this account.
 * @model spec/calendar/preservation.md
 */
export function PreservationReview() {
  const agent = useAgentView();
  const [notice, setNotice] = useState("");
  if (agent.state.status !== "TransitionRequired" && agent.state.status !== "LegacyRecovery") return null;
  const recovery = agent.state.status === "LegacyRecovery";
  return (
    <section aria-label="Saved app calendar" className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <p className="text-sm">{recovery ? "The saved app calendar needs recovery before the agent’s Calendar can start. Nothing was changed." : "Keep your saved app calendar, read only, alongside the agent’s Calendar."}</p>
      {notice && <p role="status" className="text-sm text-destructive">{notice}</p>}
      {!recovery && (
        <Button className="self-end" onClick={() => void run(LegacyCalendar.use((service) => Effect.zipRight(service.openReview(), service.confirmReadOnly()))).then(
          () => setNotice(""), () => setNotice("The saved calendar changed or couldn’t be recorded. Review it again."))}>Keep read only</Button>
      )}
    </section>
  );
}
