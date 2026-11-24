// spec/calendar/presentation.md, "Story: Open an event and come back"; spec/notes/origins.md, "Story: Go from a saved event or reminder back to its note"; spec/calendar/presentation.md, "The people list says Organizer or Alpha's word for each reply, never the provider's value"; spec/calendar/editor.md, "Deleting is an organizer's cancel or an invitee's decline, and nothing when the organizer is unknown"; spec/calendar/editor.md, "A managed Google event is never deleted here, and its other repeating changes reach one occurrence"; spec/calendar/device.md, "A lost edit or an unknown delete holds only its own event"
import { Trash2, Pencil, Video, MapPin, ExternalLink, RefreshCw, StickyNote } from "lucide-react";
import { useState } from "react";
import { type ReplyWord, replyWord } from "../../../gen/calendar__presentation.ts";
import { cancellationMode, managedDeleteOffered, managedScopeAllowed, type CancellationMode, type RecurrenceScope } from "../../../gen/calendar__editor.ts";
import type { EventRecord, CalendarRecord as CalendarSummary } from "../../calendar/feed.schema.vibe";
import { type CalendarRow, managedGoogle, repeatText } from "../../calendar/model.vibe";
import type { OriginView } from "../../notes/origins.vibe";
import { Avatar, Button, RadioGroup, RadioGroupItem, Sheet, SheetContent } from "../components/ui/index.ts";
import { intervalDetail } from "./layout.ts";

/** One guest of an event, as the people list shows them. */
export interface EventPerson {
  readonly key: string;
  readonly name: string;
  readonly reply: ReplyWord;
}

/** What the detail of an agent Calendar event knows about deleting and joining it. */
export interface EventFacts {
  readonly mode: CancellationMode;
  readonly managed: boolean;
  readonly join: string | undefined;
  readonly provider: string | undefined;
  readonly repeat: string;
  readonly invitePending: boolean;
  readonly people: readonly EventPerson[];
}

const REPLY_WORDS: Readonly<Record<ReplyWord, string>> = {
  NoReplyWord: "", WordOrganizer: "Organizer", WordAwaiting: "Awaiting reply", WordGoing: "Going", WordMaybe: "Maybe",
  WordDeclined: "Declined", WordDelegated: "Delegated", WordInvited: "Invited",
};

function https(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** The facts of an agent Calendar event: its cancellation mode, managed source, links, repeat line and unanswered invitation. */
export function eventFacts(event: EventRecord | undefined, calendar: CalendarSummary | undefined): EventFacts {
  if (event === undefined) return { mode: "OrganizerCancel", managed: false, join: undefined, provider: undefined, repeat: "", invitePending: false, people: [] };
  const self = event.attendees.find((guest) => guest.self);
  const organizerEmail = typeof event.organizer?.email === "string" ? event.organizer.email.toLowerCase() : "";
  const mode = cancellationMode(event.organizer?.self === true, self !== undefined, self?.organizer === true,
    organizerEmail !== "" && organizerEmail === (calendar?.accountEmail ?? "").toLowerCase());
  return {
    mode, managed: calendar !== undefined && managedGoogle(calendar), join: https(event.conferenceLink),
    provider: event.provider === "google" ? https(event.htmlLink) : undefined, repeat: repeatText(event.recurrence, event.recurringEventId),
    invitePending: self !== undefined && !self.organizer && (self.responseStatus === "needsAction" || self.responseStatus === "needs-action"),
    people: event.attendees.map((guest, index) => {
      const name = guest.displayName?.trim() || guest.email?.trim() || "Guest";
      return { key: `${index}:${guest.email ?? name}`, name, reply: replyWord(guest.organizer, guest.responseStatus?.trim() ?? "") };
    }),
  };
}

/** What the event detail sheet shows and the changes it offers. */
export type EventDetailProps = {
  row: CalendarRow | undefined;
  facts: EventFacts;
  /** The delete sheet is open over the detail. */
  deleting: boolean;
  /** An unconfirmed change holds this event until a read shows its outcome. */
  held: boolean;
  /** The presentation allows editing and deleting now. */
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onDelete: (scope: RecurrenceScope) => void;
  onCloseDelete: () => void;
  onCheckAgain: () => void;
  onOpenLink: (url: string) => void;
  onPlace: (place: string) => void;
  /** The note this event was made from, as Notes resolves it; absent when it was not made from a note. */
  origin?: OriginView;
  onOpenOrigin?: () => void;
  onClose: () => void;
};

const ORIGIN_WORDS: Readonly<Record<OriginView["label"], string>> = {
  FromNoteTitled: "From note", DeletedNoteLabel: "From a deleted note", KindOnlyLabel: "From a note",
};

const SCOPES: readonly { readonly scope: RecurrenceScope; readonly label: string }[] = [
  { scope: "ThisOccurrence", label: "This occurrence" }, { scope: "ThisAndFollowing", label: "This and following" }, { scope: "EntireSeries", label: "Entire series" },
];

/**
 * One event: when and where, its calendar, and only the changes Alpha can make to it exactly.
 * @model spec/calendar/presentation.md
 */
export function EventDetail({ row, facts, deleting, held, canEdit, canDelete, onEdit, onAskDelete, onDelete, onCloseDelete, onCheckAgain, onOpenLink, onPlace, origin, onOpenOrigin, onClose }: EventDetailProps) {
  const [scope, setScope] = useState<RecurrenceScope>("ThisOccurrence");
  if (row === undefined) return null;
  const detail = intervalDetail(row);
  const decline = facts.mode === "DeclineInvitation";
  const deletable = canDelete && row.writable && facts.mode !== "NoCancellation" && managedDeleteOffered(facts.managed) && !held;
  const scopes = row.recurring ? SCOPES.filter((choice) => managedScopeAllowed(facts.managed, choice.scope)) : [];
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" title={row.title}>
        <div className="flex flex-col gap-3 px-5 pb-6">
          <p className="text-sm">{detail.day ? `${detail.day} · ${detail.when}` : detail.when}</p>
          {facts.repeat && <p className="text-sm text-muted-foreground">{facts.repeat}</p>}
          {row.where && (
            <Button variant="ghost" className="justify-start" onClick={() => onPlace(row.where)}><MapPin aria-hidden />{row.where}</Button>
          )}
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{row.writable ? `${row.calendarName} · ${row.account}` : `${row.calendarName} · Read only`}</p>
          {row.notes && <p className="whitespace-pre-wrap text-sm">{row.notes}</p>}
          {origin !== undefined && (
            origin.label === "DeletedNoteLabel" || onOpenOrigin === undefined
              ? <p className="text-sm text-muted-foreground">{ORIGIN_WORDS[origin.label]}</p>
              : <Button variant="ghost" className="justify-start" onClick={onOpenOrigin}><StickyNote aria-hidden />{origin.title ? `${ORIGIN_WORDS[origin.label]} · ${origin.title}` : ORIGIN_WORDS[origin.label]}</Button>
          )}
          {facts.people.length > 0 && (
            <ul aria-label="People" className="flex flex-col">
              {facts.people.map((person) => (
                <li key={person.key} className="flex min-h-14 items-center gap-3">
                  <Avatar name={person.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{person.name}</span>
                    {REPLY_WORDS[person.reply] && <span className="block text-sm text-muted-foreground">{REPLY_WORDS[person.reply]}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {facts.invitePending && <p role="status" className="text-sm">You haven’t answered this invitation.</p>}
          {facts.managed && <p className="text-sm text-muted-foreground">{decline ? "Decline this invitation in Google Calendar." : "Delete this event in Google Calendar."}</p>}
          {held && (
            <div role="status" className="flex items-center justify-between gap-2 text-sm">
              <span>Change not confirmed</span>
              <Button variant="outline" size="sm" onClick={onCheckAgain}><RefreshCw aria-hidden />Check again</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {facts.join && <Button variant="secondary" onClick={() => onOpenLink(facts.join!)}><Video aria-hidden />Join</Button>}
            {facts.provider && <Button variant="ghost" onClick={() => onOpenLink(facts.provider!)}><ExternalLink aria-hidden />Open in Google Calendar</Button>}
            {canEdit && row.writable && !held && <Button variant="secondary" onClick={onEdit}><Pencil aria-hidden />Edit</Button>}
            {deletable && <Button variant="destructive" onClick={onAskDelete}><Trash2 aria-hidden />{decline ? "Decline" : "Delete"}</Button>}
          </div>
          {deleting && (
            <div role="dialog" aria-label={decline ? "Decline invitation?" : "Delete event?"} className="flex flex-col gap-3 border-t border-border pt-3">
              <p className="font-serif text-xl">{decline ? "Decline invitation?" : "Delete event?"}</p>
              {scopes.length > 0 && (
                <RadioGroup value={scope} onValueChange={(value) => setScope(value as RecurrenceScope)} aria-label="Occurrences">
                  {scopes.map((choice) => (
                    <label key={choice.scope} className="flex min-h-11 items-center gap-3 text-sm"><RadioGroupItem value={choice.scope} />{choice.label}</label>
                  ))}
                </RadioGroup>
              )}
              <p className="text-sm text-muted-foreground">No guest notification will be sent. Undo is available for 10 seconds.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onCloseDelete}>Cancel</Button>
                <Button variant="destructive" onClick={() => onDelete(row.recurring ? scope : "NoScope")}>{decline ? "Decline invitation" : "Delete event"}</Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
