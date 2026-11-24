// spec/clock/reminders.md, "Story: See my reminders as the phone holds them"; spec/clock/reminders.md, "Story: Change a reminder exactly once"; spec/clock/reminderTaps.md, "Story: Open the reminder I tapped"; spec/clock/reminderDrafts.md, "Story: Find my unsaved reminder where I left it"; spec/clock/reminderPage.md, "Story: Step back out of what I have open in Reminders"
import { useState } from "react";
import { BellRing, Check, ChevronLeft, CircleAlert, ListTodo, Plus, RefreshCw, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { canBeginWrite, type ReminderRow, type Reminders } from "../../../gen/clock__reminders.ts";
import { formShown, type ReminderPage } from "../../../gen/clock__reminderPage.ts";
import { confirmedSave } from "../../clock/drafts.vibe";
import type { ReminderDraft } from "../../clock/schedule.ts";
import { overdue, repeatOf, todos, upcoming } from "../../clock/schedule.ts";
import { Alert, Button, Dialog, DialogContent, DialogTitle, EmptyState, Input, ListRow, Separator } from "../components/ui/index.ts";
import { ReminderForm } from "./ReminderForm.tsx";
import { reminderOutcome } from "./text.ts";

/** The Reminders screen's listing, the write in progress, the kept drafts and every owner action. */
export type RemindersViewProps = {
  /** The listing, its refreshes and the write in progress. */
  reminders: Reminders;
  /** The kept form of a new reminder, if one was left unsaved. */
  keptNew?: ReminderDraft;
  /** The kept form of an edit, the reminder it edits and the revision it started on. */
  keptEdit?: { readonly id: string; readonly revision: string; readonly draft: ReminderDraft };
  /** The owner asked to discard a kept draft and has not answered yet. */
  discarding: boolean;
  /** The open form changed: keep it. */
  onKeep: (form: "new" | "edit", draft: ReminderDraft) => void;
  /** Asks to discard the kept draft of a form. */
  onDiscard: (form: "new" | "edit") => void;
  /** Answers the discard question. */
  onDiscardAnswer: (confirmed: boolean) => void;
  /** Unconfirmed creations and changes kept in the journal. */
  unconfirmed: number;
  /** A tapped reminder whose link is still pending. */
  tapPending: boolean;
  /** What the page has open: the reminder shown, the form and the Reopen question. */
  page: ReminderPage;
  /** The page's latest instant. */
  now: number;
  onOpen: (id: string | undefined) => void;
  /** Opens the new-reminder form, or the edit form of the reminder shown. */
  onOpenForm: (form: "new" | "edit") => void;
  /** Cancel closes the form; a kept draft stays. */
  onCloseForm: () => void;
  /** Asks whether to reopen the completed reminder shown. */
  onAskReopen: (mode: "open" | "tomorrow") => void;
  /** Answers or dismisses the Reopen question. */
  onCloseReopen: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onCreate: (draft: ReminderDraft) => void;
  onContinueCreate: (approved: boolean) => void;
  onEdit: (row: ReminderRow, draft: ReminderDraft) => void;
  onDecide: (row: ReminderRow, decision: "done" | "snooze") => void;
  onReopen: (row: ReminderRow, mode: "open" | "tomorrow") => void;
  onDelete: (row: ReminderRow) => void;
  onSaveTodo: (title: string) => void;
  onTodo: (row: ReminderRow, decision: "done" | "reopen" | "cancel") => void;
  onOpenTap: () => void;
  onDismissTap: () => void;
};

const when = (at: number) => new Date(at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function draftOf(row: ReminderRow | undefined): ReminderDraft {
  if (row === undefined) {
    const at = new Date();
    at.setHours(at.getHours() + 1, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(at);
    day.setHours(0, 0, 0, 0);
    return { title: "", body: "", dayOffset: Math.round((day.getTime() - today.getTime()) / 86_400_000), minuteOfDay: at.getHours() * 60, repeat: "none", alertMinutes: 0 };
  }
  const due = new Date(row.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  return { title: row.title, body: row.body, dayOffset: Math.round((day.getTime() - today.getTime()) / 86_400_000), minuteOfDay: due.getHours() * 60 + due.getMinutes(), repeat: repeatOf(row.rule), alertMinutes: row.hasAlert ? row.alertMinutes : null };
}

/**
 * Reminders and to-dos as the phone holds them, with one change at a time.
 * @model spec/clock/reminders.md
 */
export function RemindersView(props: RemindersViewProps) {
  const { reminders, keptNew, keptEdit, discarding, unconfirmed, tapPending, page, now, onOpen, onOpenForm, onCloseForm, onAskReopen, onCloseReopen, onBack, onRefresh, onCreate, onContinueCreate, onEdit, onDecide, onReopen, onDelete, onSaveTodo, onTodo, onOpenTap, onDismissTap, onKeep, onDiscard, onDiscardAnswer } = props;
  const [todo, setTodo] = useState("");
  const saving = reminders.stage !== "WIdle";
  const editing = formShown(page, confirmedSave(reminders));
  const form = page.form === "EditForm" ? "edit" : "new";
  const openForm = onOpenForm;
  const reopening = page.reopen === "ReopenOpen" ? "open" : page.reopen === "ReopenTomorrow" ? "tomorrow" : undefined;
  const row = reminders.rows.find((r) => r.id === page.detail);
  const outcome = reminderOutcome(reminders.outcome, row?.repeats ?? false);
  const allowed = (kind: Parameters<typeof canBeginWrite>[1], r: ReminderRow) => canBeginWrite(reminders, kind, r.id, r.revision);
  const listed = (rows: ReminderRow[]) => rows.map((r) => (
    <li key={r.id}>
      <ListRow title={r.title} detail={when(r.dueAt)} leading={r.status === "RPosted" ? <BellRing aria-label="Due" className="size-5 text-primary" /> : undefined} onClick={() => onOpen(r.id)} />
    </li>
  ));
  const late = overdue(reminders.rows, now);
  const coming = upcoming(reminders.rows).filter((r) => !late.includes(r));
  const createReview = reminders.stage === "WReview" && reminders.kind === "CreateWrite";
  const editKept = keptEdit !== undefined && row !== undefined && keptEdit.id === row.id ? keptEdit : undefined;
  const formKept = form === "new" ? keptNew !== undefined : editKept !== undefined;
  return (
    <main className="flex min-h-full flex-col gap-4 bg-background px-4 pt-4 pb-28 text-foreground">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={row ? () => onOpen(undefined) : onBack}><ChevronLeft aria-hidden className="size-6" /></Button>
        <h1 className="flex-1 font-serif text-3xl">{row ? row.title : "Reminders"}</h1>
        {!row && <Button variant="ghost" size="icon" aria-label="Refresh" onClick={onRefresh}><RefreshCw aria-hidden className="size-5" /></Button>}
        {!row && !editing && <Button size="icon" aria-label="New reminder" disabled={saving} onClick={() => openForm("new")}><Plus aria-hidden className="size-5" /></Button>}
      </header>
      {reminders.stale && <Alert role="status"><CircleAlert aria-hidden className="mr-2 inline size-4" />Out of date</Alert>}
      {tapPending && (
        <Alert className="flex items-center gap-2">
          <span className="flex-1">Reminder link</span>
          <Button size="sm" variant="secondary" onClick={onOpenTap}>Open</Button>
          <Button size="sm" variant="ghost" onClick={onDismissTap}>Dismiss</Button>
        </Alert>
      )}
      {unconfirmed > 0 && (
        <Alert className="flex items-center gap-2">
          <span className="flex-1">{`${unconfirmed} unconfirmed`}</span>
          <Button size="sm" variant="secondary" onClick={onRefresh}>Check</Button>
        </Alert>
      )}
      {outcome && <p role="status" className="text-sm text-muted-foreground">{outcome}</p>}
      {!editing && !row && keptNew !== undefined && (
        <Alert className="flex items-center gap-2">
          <span className="flex-1">{keptNew.title.trim() || "Unsaved reminder"}</span>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => openForm("new")}>Resume</Button>
          <Button size="sm" variant="ghost" onClick={() => onDiscard("new")}>Discard</Button>
        </Alert>
      )}
      {!editing && row !== undefined && editKept !== undefined && (
        <Alert className="flex items-center gap-2">
          <span className="flex-1">Unsaved changes</span>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => openForm("edit")}>Resume</Button>
          <Button size="sm" variant="ghost" onClick={() => onDiscard("edit")}>Discard</Button>
        </Alert>
      )}
      {editing ? (
        <ReminderForm
          key={form === "edit" ? `edit:${row?.id ?? ""}` : "new"}
          initial={form === "edit" ? editKept?.draft ?? draftOf(row) : keptNew ?? draftOf(undefined)}
          saving={saving}
          kept={formKept}
          onChange={(draft) => onKeep(form === "edit" ? "edit" : "new", draft)}
          onCancel={onCloseForm}
          onDiscard={() => onDiscard(form === "edit" ? "edit" : "new")}
          onSave={(draft) => { if (form === "edit" && row) onEdit(row, draft); else onCreate(draft); }}
        />
      ) : row ? (
        <section className="flex flex-col gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{row.undated ? "To-do" : `Due ${when(row.dueAt)}`}</p>
          {row.body && <p className="whitespace-pre-wrap">{row.body}</p>}
          <div className="flex flex-wrap gap-2">
            {allowed("DoneWrite", row) && <Button disabled={saving} onClick={() => onDecide(row, "done")}><Check aria-hidden className="size-4" />Done</Button>}
            {allowed("SnoozeWrite", row) && <Button variant="secondary" disabled={saving} onClick={() => onDecide(row, "snooze")}>Snooze</Button>}
            {allowed("ReopenWrite", row) && <Button variant="secondary" disabled={saving} onClick={() => onAskReopen("open")}><RotateCcw aria-hidden className="size-4" />Reopen</Button>}
            {allowed("ReopenWrite", row) && <Button variant="outline" disabled={saving} onClick={() => onAskReopen("tomorrow")}>Tomorrow</Button>}
            {allowed("EditWrite", row) && <Button variant="outline" disabled={saving} onClick={() => openForm("edit")}>Edit</Button>}
            {allowed("DeleteWrite", row) && <Button variant="ghost" aria-label="Delete reminder" disabled={saving} onClick={() => onDelete(row)}><Trash2 aria-hidden className="size-4" /></Button>}
          </div>
        </section>
      ) : (
        <>
          {late.length > 0 && (
            <section aria-label="Overdue">
              <h2 className="font-mono text-xs uppercase tracking-widest text-destructive">Overdue</h2>
              <ul>{listed(late)}</ul>
            </section>
          )}
          {coming.length === 0 && late.length === 0 && todos(reminders.rows).length === 0
            ? <EmptyState title={reminders.loaded ? "No reminders" : "Loading"} icon={<BellRing className="size-8" />} />
            : <ul className="flex flex-col divide-y divide-border">{listed(coming)}</ul>}
          {reminders.todoVersion === 1 && (
            <section aria-label="To-dos" className="flex flex-col gap-2">
              <Separator />
              <ul className="flex flex-col">
                {todos(reminders.rows).map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <ListRow title={t.title} className={t.status === "RCompleted" ? "flex-1 text-muted-foreground line-through" : "flex-1"} leading={<ListTodo aria-hidden className="size-5" />}
                      disabled={saving} onClick={() => onTodo(t, t.status === "RCompleted" ? "reopen" : "done")} />
                    <Button variant="ghost" size="icon" aria-label={`Delete ${t.title}`} disabled={saving || !allowed("TodoDeleteWrite", t)} onClick={() => onTodo(t, "cancel")}><Trash2 aria-hidden className="size-4" /></Button>
                  </li>
                ))}
              </ul>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (todo.trim()) { onSaveTodo(todo); setTodo(""); } }}>
                <Input aria-label="New to-do" value={todo} maxLength={200} onChange={(e) => setTodo(e.target.value)} />
                <Button type="submit" size="icon" aria-label="Add to-do" disabled={saving || !todo.trim()}><Plus aria-hidden className="size-4" /></Button>
              </form>
            </section>
          )}
        </>
      )}
      <Dialog open={createReview} onOpenChange={(open) => { if (!open) onContinueCreate(false); }}>
        <DialogContent>
          <DialogTitle>Create another?</DialogTitle>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onContinueCreate(false)}>Cancel</Button>
            <Button onClick={() => onContinueCreate(true)}>Create another</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={discarding} onOpenChange={(open) => { if (!open) onDiscardAnswer(false); }}>
        <DialogContent>
          <DialogTitle>Discard unsaved reminder?</DialogTitle>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onDiscardAnswer(false)}>Keep</Button>
            <Button variant="destructive" onClick={() => { onDiscardAnswer(true); onCloseForm(); }}>Discard</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reopening !== undefined && row !== undefined} onOpenChange={(open) => { if (!open) onCloseReopen(); }}>
        <DialogContent>
          <DialogTitle>Reopen?</DialogTitle>
          <p className="text-sm text-muted-foreground">{reopening === "open" ? "No alert" : "Alert tomorrow at the same time"}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCloseReopen}><Undo2 aria-hidden className="size-4" />Cancel</Button>
            <Button onClick={() => { if (row && reopening) onReopen(row, reopening); onCloseReopen(); }}>Reopen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
