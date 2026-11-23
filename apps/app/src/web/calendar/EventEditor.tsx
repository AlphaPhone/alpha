// spec/calendar/drafts.md, "Story: Keep what I typed when Calendar is interrupted"; spec/calendar/editor.md, "Story: Set an event's time with controls that never produce an impossible range"; spec/calendar/drafts.md, "Story: Recover a draft whose storage cannot be read"; spec/calendar/drafts.md, "Story: Save an event from its draft exactly once"; spec/calendar/editor.md, "Story: Know why Save is off"; spec/calendar/editor.md, "A repeating event changes its repeat only for the entire series"
import { useState } from "react";
import type { EditorDraft } from "../../../gen/calendar__drafts.ts";
import { recurrenceEditAllowed, saveBlock, type RecurrenceScope, type SaveBlock } from "../../../gen/calendar__editor.ts";
import type { DraftFieldsRecord } from "../../calendar/drafts.schema.vibe";
import { moveEnd, moveStart, nudgeEnd, nudgeStart } from "../../calendar/formTime.vibe";
import { Button, Checkbox, Input, Label, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, Textarea } from "../components/ui/index.ts";

const ZONES = ["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Africa/Lagos", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"];

/** The device zone first, then the event's, then the common zones, each once. */
export function zoneChoices(deviceZone: string, selected?: string): string[] {
  return [...new Set([deviceZone, ...(selected ? [selected] : []), ...ZONES])];
}

const SAVE_REASON: Readonly<Record<SaveBlock, string>> = {
  SaveAllowed: "", WaitLoading: "Loading", WaitSaving: "Saving", OtherAccount: "Other account", CheckEvent: "Check event", AddTitle: "Add a title",
};

/** The form an editor shows, its retained draft, and why Save is off. */
export type EventEditorProps = {
  /** The fields as opened: the event's own, a new event's defaults, or a note's or scan's. */
  fields: DraftFieldsRecord;
  draft: EditorDraft;
  /** Editing an existing repeating event, which needs a scope. */
  recurring: boolean;
  /** Times that cannot be shown as a wall-clock span keep their original time. */
  timingLocked: boolean;
  deviceZone: string;
  loading: boolean;
  otherAccount: boolean;
  eventChanged: boolean;
  /** Why the last save did not go ahead, in the owner's words. */
  problem: string;
  onEdit: (fields: DraftFieldsRecord) => void;
  onRestore: () => Promise<DraftFieldsRecord | undefined>;
  onReview: (kind: "DiscardReview" | "ReplaceReview") => void;
  onAnswerReview: (confirmed: boolean) => void;
  onRetry: () => void;
  /** A step of the recovery of a draft whose storage cannot be read. */
  onRecovery: (step: "open" | "request" | "confirm" | "close") => void;
  onSave: (fields: DraftFieldsRecord) => void;
  onClose: () => void;
};

const RECOVERY_TEXT: Readonly<Record<EditorDraft["recovery"], string>> = {
  NoRecovery: "",
  RecoveryNotice: "This draft can’t be read. It is kept on this phone, and nothing was changed.",
  RecoveryCapturing: "Reading the saved draft…",
  RecoveryUnreadable: "The saved draft could not be read. Nothing was changed.",
  RecoveryReady: "Development build: the saved draft was captured. Reset removes only this snapshot.",
  RecoveryConfirm: "Reset the captured draft? Anything written since keeps it.",
  RecoveryResetting: "Resetting the captured draft…",
  RecoveryReloading: "The draft was reset.",
};

const SCOPE_VALUE: Readonly<Record<string, RecurrenceScope>> = { instance: "ThisOccurrence", this_and_following: "ThisAndFollowing", series: "EntireSeries" };

/**
 * The event form over its retained draft: typed edits are kept, offered back on reopening, and saved only from what is shown.
 * @model spec/calendar/drafts.md
 */
export function EventEditor({ fields: opened, draft, recurring, timingLocked, deviceZone, loading, otherAccount, eventChanged, problem, onEdit, onRestore, onReview, onAnswerReview, onRetry, onRecovery, onSave, onClose }: EventEditorProps) {
  const [fields, setFields] = useState(opened);
  const replace = (next: DraftFieldsRecord) => {
    setFields(next);
    onEdit(next);
  };
  const change = (patch: Partial<DraftFieldsRecord>) => replace({ ...fields, ...patch });
  const inert = !draft.opened || draft.offered || draft.saving || draft.latch;
  const scope: RecurrenceScope = fields.recurrenceScope === undefined ? "NoScope" : SCOPE_VALUE[fields.recurrenceScope] ?? "NoScope";
  const repeatChanged = fields.repeat !== opened.repeat && fields.repeat !== "preserve";
  const blocked = saveBlock(loading, draft.saving, otherAccount, eventChanged, fields.title.trim() === "");
  const scopeProblem = recurring && (scope === "NoScope" || !recurrenceEditAllowed(recurring, repeatChanged, scope));
  const saveOff = blocked !== "SaveAllowed" || scopeProblem || !draft.opened || draft.offered || draft.conflict || draft.storageError || draft.invalid || draft.latch;
  const status = draft.latch ? "Saved · discard draft" : draft.invalid ? "Can’t keep edits" : draft.offered ? "Unsaved edits" : draft.conflict ? "Draft changed in another window"
    : draft.storageError ? "Couldn’t keep edits" : draft.saveResult === "StaleRefused" ? "These edits belong to an older version. Discard them and reopen the event." : "";
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="full" title={opened.creationId && !recurring && opened.expectedProviderVersion === undefined ? "New event" : "Edit event"}>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
          {(status || problem) && <p role="status" aria-label="Draft status" className="text-sm">{problem || status}</p>}
          {(draft.offered || draft.conflict) && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void onRestore().then((restored) => restored && setFields(restored))}>Restore</Button>
              {draft.conflict && <Button variant="outline" onClick={() => onReview("ReplaceReview")}>Keep what I see</Button>}
              {draft.offered && !draft.conflict && <Button variant="ghost" onClick={() => onReview("DiscardReview")}>Discard</Button>}
            </div>
          )}
          {draft.storageError && draft.recovery === "NoRecovery" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onRetry}>Retry</Button>
              <Button variant="ghost" onClick={() => onRecovery("open")}>Recover draft</Button>
            </div>
          )}
          {draft.recovery !== "NoRecovery" && (
            <div role="dialog" aria-label="Draft recovery" className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="text-sm">{RECOVERY_TEXT[draft.recovery]}</p>
              <div className="flex justify-end gap-2">
                {draft.recovery !== "RecoveryReloading" && draft.recovery !== "RecoveryResetting" && <Button variant="ghost" onClick={() => onRecovery("close")}>Close</Button>}
                {draft.recovery === "RecoveryReady" && <Button variant="outline" onClick={() => onRecovery("request")}>Reset draft</Button>}
                {draft.recovery === "RecoveryConfirm" && <Button variant="destructive" onClick={() => onRecovery("confirm")}>Reset this snapshot</Button>}
              </div>
            </div>
          )}
          {draft.review !== "NoDraftReview" && (
            <div role="dialog" aria-label={draft.review === "DiscardReview" ? "Discard saved edits?" : "Replace saved edits?"} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="font-display text-lg">{draft.review === "DiscardReview" ? "Discard saved edits?" : "Replace saved edits?"}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => onAnswerReview(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => onAnswerReview(true)}>{draft.review === "DiscardReview" ? "Discard edits" : "Replace saved edits"}</Button>
              </div>
            </div>
          )}
          <fieldset disabled={inert} className="flex flex-col gap-4">
            <Label className="flex flex-col gap-1">Title<Input value={fields.title} maxLength={2048} onChange={(event) => change({ title: event.target.value })} /></Label>
            <label className="flex items-center gap-3 text-sm"><Checkbox checked={fields.allDay} disabled={timingLocked} onCheckedChange={(checked) => change({ allDay: checked === true })} />All day</label>
            {timingLocked ? <p className="text-sm text-muted-foreground">The original event time is kept. Reopen the event to review timing changes.</p> : (
              <div className="grid grid-cols-2 gap-3">
                <Label className="flex flex-col gap-1">Starts<Input type={fields.allDay ? "date" : "datetime-local"} value={fields.start}
                  onChange={(event) => (fields.allDay ? change({ start: event.target.value }) : replace(moveStart(fields, event.target.value)))} /></Label>
                <Label className="flex flex-col gap-1">Ends<Input type={fields.allDay ? "date" : "datetime-local"} value={fields.end}
                  onChange={(event) => (fields.allDay ? change({ end: event.target.value }) : replace(moveEnd(fields, event.target.value)))} /></Label>
                {!fields.allDay && (
                  <>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" aria-label="Start 15 minutes earlier" onClick={() => replace(nudgeStart(fields, false))}>−15</Button>
                      <Button variant="outline" size="sm" aria-label="Start 15 minutes later" onClick={() => replace(nudgeStart(fields, true))}>+15</Button>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" aria-label="End 15 minutes earlier" onClick={() => replace(nudgeEnd(fields, false))}>−15</Button>
                      <Button variant="outline" size="sm" aria-label="End 15 minutes later" onClick={() => replace(nudgeEnd(fields, true))}>+15</Button>
                    </div>
                  </>
                )}
              </div>
            )}
            {!fields.allDay && (
              <Select value={fields.zone} onValueChange={(zone) => change({ zone })}>
                <SelectTrigger aria-label="Time zone"><SelectValue /></SelectTrigger>
                <SelectContent>{zoneChoices(deviceZone, fields.zone).map((zone) => <SelectItem key={zone} value={zone}>{zone === deviceZone ? `${zone} (this phone)` : zone}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={fields.repeat} onValueChange={(repeat) => change({ repeat: repeat as DraftFieldsRecord["repeat"] })}>
              <SelectTrigger aria-label="Repeat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {recurring && <SelectItem value="preserve">Keep repeat</SelectItem>}
                <SelectItem value="none">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            {recurring && (
              <RadioGroup aria-label="Applies to" value={fields.recurrenceScope ?? ""} onValueChange={(value) => change({ recurrenceScope: value as DraftFieldsRecord["recurrenceScope"] })}>
                {(["instance", "this_and_following", "series"] as const).map((value) => (
                  <label key={value} className="flex min-h-11 items-center gap-3 text-sm"><RadioGroupItem value={value} />
                    {value === "instance" ? "This occurrence" : value === "this_and_following" ? "This and following" : "Entire series"}</label>
                ))}
              </RadioGroup>
            )}
            {recurring && repeatChanged && scope !== "EntireSeries" && <p className="text-sm">Choose Entire series to change how it repeats.</p>}
            <Label className="flex flex-col gap-1">Location<Input value={fields.location} maxLength={2048} onChange={(event) => change({ location: event.target.value })} /></Label>
            <Label className="flex flex-col gap-1">Notes<Textarea value={fields.body} maxLength={32768} onChange={(event) => change({ body: event.target.value })} /></Label>
            <p className="text-sm text-muted-foreground">Alpha won’t alert you about this event.</p>
          </fieldset>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {blocked !== "SaveAllowed" && <span className="mr-auto text-sm text-muted-foreground">{SAVE_REASON[blocked]}</span>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={saveOff} loading={draft.saving} onClick={() => onSave(fields)}>Save event</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
