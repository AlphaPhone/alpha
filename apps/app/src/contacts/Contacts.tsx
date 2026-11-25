// spec/app/contacts/index.md, "Story: Browse my contacts"; spec/app/contacts/index.md, "Story: Give Alpha access to my contacts"; spec/app/contacts/index.md, "Story: Look at one contact"; spec/app/contacts/index.md, "Story: Add or change a contact"; spec/app/contacts/index.md, "Story: Delete a contact"; spec/app/contacts/index.md, "Story: Know what happened to my change"
import { Alert, AppHeader, Avatar, Banner, Button, Chip, ConfirmDialog, Input, ListGroup, ListRow, SearchField, Spinner, Tabs, TabsContent, Textarea } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { CONTACT_MAX_ADDRESS, CONTACT_MAX_NAME, CONTACT_MAX_NOTES, CONTACT_MAX_NUMBER } from "@elizaos/os/bridges/contacts";
import { ArrowLeft, Check, ChevronDown, Mail, MessageSquare, Minus, Pencil, Phone as Call, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import type { Machine as ContactsMachine } from "../../gen/app__contacts.effect.vibe";
import { accessNeeded, listFailed, listedEmpty, maxEach, noMatches, pending, refused, shown, uncertain } from "../../gen/app__contacts.ts";
import { useMachine as useContacts } from "../../gen/app__contacts.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Machine as VoicemailMachine } from "../../gen/app__phone__voicemail.effect.vibe";
import { useMachine as useVoicemail } from "../../gen/app__phone__voicemail.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { PhoneTabs } from "../phone/PhoneTabs.tsx";
import { type Book, type Form, Rows, blankForm, sheetOf } from "./contacts.vibe";
import { CommsBar, type CommsServices } from "../phone/CommsBar.tsx";
import type { Alpha } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";

export interface ContactsProps {
  /** Provides Contacts' machine, resident, Phone's, for whether a call may be an emergency call, and what Contacts counts. */
  runtime: ManagedRuntime.ManagedRuntime<ContactsMachine | PhoneMachine | VoicemailMachine | Rows | CommsServices, unknown>;
}

/**
 * Contacts: the list with favourites and search, one contact as the phone holds it, and the form. Call and Message
 * open Phone or Messages with the number filled in; nothing is dialled or sent here.
 * @model spec/app/contacts/index.md
 */
export function Contacts({ runtime, alpha }: ContactsProps & { alpha: Alpha }) {
  const contacts = useContacts(runtime);
  const dialer = usePhone(runtime);
  const phone = dialer.state;
  const voicemail = useVoicemail(runtime).state;
  const shell = useShell(runtime);
  const held = runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get()));
  const groups = useMemo(() => Object.entries(Object.groupBy(held.rows, (row) =>
    Array.from(row.name.trim())[0]?.toLocaleUpperCase() ?? "#")), [held.rows]);
  const favourites = useMemo(() => held.rows.filter((row) => row.starred), [held.rows]);
  if (contacts.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Contacts</Alert>;
  const { state, can, send } = contacts;
  if (!state || !phone) return null;
  const { searching } = state;
  const query = state.sought ? held.sought : "";
  const set = (change: Partial<Book>) => runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set(change)));
  const search = (typed: string) => {
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (!can(event)) return;
    set({ sought: typed });
    void send(event);
  };
  const safe = clear(phone);
  if (state.form !== "Shut") return <Editor runtime={runtime} />;
  const open = (id: string) => {
    set({ card: undefined });
    void send({ type: "openContact", contact: id });
  };
  const canBack = shell.can({ type: "goBack" });
  const phoneTabs = !searching && !state.opened && shell.state?.trail.at(-2) === "Phone";
  const back = canBack ? () => void alpha.back() : undefined;
  const select = async (tab: string) => {
    if ((tab !== "Recents" && tab !== "Keypad" && tab !== "Voicemail") || !canBack) return;
    const event = { type: "pickTab", tab } as const;
    if (dialer.can(event)) await dialer.send(event);
    await shell.send({ type: "goBack" });
  };
  const actions = (
    <>
      {can({ type: "beginSearch" }) && <Button variant="ghost" size="icon" aria-label="Search contacts" onClick={() => void send({ type: "beginSearch" })}><Search className="size-5" /></Button>}
      {can({ type: "compose" }) && <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => { set({ form: blankForm, editBase: undefined, problem: undefined }); void send({ type: "compose" }); }}><Plus className="size-5" /></Button>}
      {can({ type: "composeElsewhere" }) && <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => void send({ type: "composeElsewhere" })}><Plus className="size-5" /></Button>}
    </>
  );
  const header = searching ? (
    <form role="search" aria-label="Search contacts" data-host-chrome="" className="flex min-h-14 items-center px-2" onSubmit={(event) => event.preventDefault()}>
      {can({ type: "endSearch" }) && <Button variant="ghost" size="icon" aria-label="Back to contacts" onClick={() => void send({ type: "endSearch" })}><ArrowLeft className="size-5" /></Button>}
      <SearchField autoFocus className="mr-2 flex-1" aria-label="Search contacts" clearLabel="Clear search" placeholder="Search contacts" value={query} onValueChange={search} />
    </form>
  ) : phoneTabs ? (
    <PhoneTabs title="Contacts" contacts voicemail={phone.voicemail} unheard={(voicemail?.unheard ?? 0) > 0} onBack={back}>{actions}</PhoneTabs>
  ) : (
    <AppHeader title="Contacts" leading={<AppBack alpha={alpha} />}>{actions}</AppHeader>
  );
  const content = (
    <section aria-label="Contacts" className="flex flex-1 flex-col gap-2">
      {!state.opened && !phoneTabs && header}
      {pending(state) && <Banner>Contact change pending</Banner>}
      {uncertain(state) && <Banner variant="warn" action={can({ type: "refresh" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh" })}>Refresh</Button>}>Outcome unknown: refresh</Banner>}
      {accessNeeded(state) && (
        <Banner variant="warn" action={can({ type: "allow" }) ? <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button> : can({ type: "openSettings" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "openSettings" })}>Open Settings</Button>}>
          Contacts needs access to your address book
        </Banner>
      )}
      {state.opened ? <Card runtime={runtime} safe={safe} /> : (
        <>
          {state.sought && !searching && <Chip className="mx-4 self-start" onClear={() => void send({ type: "endSearch" })} clearLabel="Clear the search">{query} · {state.rows}</Chip>}
          {searching && <div className="flex gap-2 px-4" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "Everyone" ? "primary" : "outline"} aria-pressed={state.chip === "Everyone"} onClick={() => void (can({ type: "pick", chip: "Everyone" }) && send({ type: "pick", chip: "Everyone" }))}>All</Button>
            <Button size="sm" variant={state.chip === "Favourites" ? "primary" : "outline"} aria-pressed={state.chip === "Favourites"} onClick={() => void (can({ type: "pick", chip: "Favourites" }) && send({ type: "pick", chip: "Favourites" }))}>Favourites</Button>
          </div>}
          {state.list.status === "Loading" && state.rows === 0 && <Spinner label="Reading contacts" />}
          {listFailed(state) && <Banner variant="destructive" action={can({ type: "refresh" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh" })}>Retry</Button>}>Contacts could not be read</Banner>}
          {listedEmpty(state) && <p role="status" className="flex min-h-45 flex-1 items-center justify-center p-6 text-center text-muted-foreground">No contacts yet</p>}
          {noMatches(state) && <p role="status" className="mx-5 my-3 text-muted-foreground">No matches</p>}
          {state.rows > 0 && (
            <ListGroup aria-label="Contacts" surface="plain">
              {!state.sought && favourites.length > 0 && <div className="flex touch-pan-x gap-1.5 overflow-x-auto px-3.5 pt-2 pb-2.5" role="group" aria-label="Favourites">
                {favourites.map((row) => (
                  <Button key={row.id} variant="ghost" aria-label={`Open favourite ${row.name}`} className="h-auto w-18 flex-col gap-1.5 rounded-tile p-0" disabled={!can({ type: "openContact", contact: row.id })} onClick={() => open(row.id)}>
                    <Avatar name={row.name} className="size-15 text-lg font-bold" />
                    <span className="w-full truncate text-sm font-normal">{row.name.trim().split(/\s+/, 1)[0]}</span>
                  </Button>
                ))}
              </div>}
              {groups.map(([letter, rows]) => (
                <div key={letter}>
                  {state.rows >= 20 && <h2 className="px-6 pt-3 pb-0.5 text-sm font-semibold text-muted-foreground">{letter}</h2>}
                  {rows?.map((row) => <ListRow key={row.id} aria-label={row.name} title={<span className="block truncate font-semibold">{row.name}</span>}
                    className="min-h-15 px-5 py-1.5" leading={<Avatar name={row.name} className="size-11 text-base font-bold" />}
                    disabled={!can({ type: "openContact", contact: row.id })} onClick={() => open(row.id)} />)}
                </div>
              ))}
            </ListGroup>
          )}
          {can({ type: "loadMore" }) && <Button variant="secondary" size="icon" aria-label="More contacts" className="self-center" onClick={() => void send({ type: "loadMore" })}><ChevronDown /></Button>}
        </>
      )}
      <div className="px-4"><CommsBar runtime={runtime} /></div>
    </section>
  );
  if (!phoneTabs) return content;
  return (
    <Tabs value="Contacts" onValueChange={(value) => void select(value)} className="min-h-0 flex-1 gap-0">
      {header}
      <TabsContent value="Contacts" className="min-h-0 flex-1 overflow-y-auto">{content}</TabsContent>
    </Tabs>
  );
}

/** One contact as the phone holds it now. */
function Card({ runtime, safe }: ContactsProps & { safe: boolean }) {
  const { state, can, send } = useContacts(runtime);
  if (!state) return null;
  const card = runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get())).card;
  const reach = (how: "Call" | "Message", number: string) => {
    runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({ reach: number })));
    void send({ type: "reach", how });
  };
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div data-host-chrome="" className="flex items-center gap-2 px-2">
        {can({ type: "closeContact" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "closeContact" })}><ArrowLeft /></Button>}
        <span className="flex-1" />
        {card && can({ type: "amend" }) && <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => {
          runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({
            editBase: card, problem: undefined,
            form: {
              givenName: card.givenName, familyName: card.familyName,
              phones: card.phoneNumbers.length === 0 ? [""] : card.phoneNumbers.map((one) => one.number),
              emails: card.emailAddresses.length === 0 ? [""] : card.emailAddresses.map((one) => one.address), notes: card.notes ?? "",
            },
          })));
          void send({ type: "amend" });
        }}><Pencil /></Button>}
        {can({ type: "amendElsewhere" }) && <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => void send({ type: "amendElsewhere" })}><Pencil /></Button>}
        {can({ type: "askDelete" }) && <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete" onClick={() => void send({ type: "askDelete" })}><Trash2 /></Button>}
      </div>
      {state.card.status === "Loading" && <Spinner label="Reading the contact" />}
      {state.card.status === "Failed" && <Banner variant="destructive">The contact could not be read</Banner>}
      {shown(state) && card && (
        <>
          <Avatar name={card.displayName} aria-hidden className="size-22 self-center font-display text-contact-initials font-light" />
          <h1 className="px-4 text-center font-display text-contact-name font-light break-words">{card.displayName}</h1>
          {card.phoneNumbers.length > 0 && <div className="flex flex-wrap justify-center gap-2 px-4 pt-2" role="group" aria-label="Contact actions">
            {[...new Set(card.phoneNumbers.map(({ number }) => number))].flatMap((number) => [
              can({ type: "reach", how: "Call" }) && <Button key={`call ${number}`} variant="secondary" size="icon" className="size-14" aria-label={`Call ${number}`} onClick={() => reach("Call", number)}><Call /></Button>,
              can({ type: "reach", how: "Message" }) && <Button key={`message ${number}`} variant="secondary" size="icon" className="size-14" aria-label={`Message ${number}`} onClick={() => reach("Message", number)}><MessageSquare /></Button>,
            ])}
          </div>}
          <ListGroup surface="plain" aria-label="Contact details" className="mx-4 mt-5 rounded-sheet bg-secondary">
            {card.phoneNumbers.map((phone, at) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- The phone can return a duplicated number at distinct positions.
              <ListRow key={`${phone.number}-${at}`} title={<span className="wrap-anywhere whitespace-normal">{phone.number}</span>} detail={contactLabel(phone.type)}
                leading={<Call className="size-5" />} className="min-h-13.5 px-5 select-text" />
            ))}
            {card.emailAddresses.map((email, at) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- The phone can return a duplicated address at distinct positions.
              <ListRow key={`${email.address}-${at}`} title={<span className="wrap-anywhere whitespace-normal">{email.address}</span>} detail={contactLabel(email.type)} leading={<Mail className="size-5" />} className="min-h-13.5 px-5 select-text" />
            ))}
            {card.notes && <ListRow title={<span className="wrap-anywhere whitespace-pre-wrap">{card.notes}</span>} detail="Notes" className="min-h-13.5 px-5 select-text" />}
          </ListGroup>
          {card.notes === undefined && <p className="mx-4 text-sm text-muted-foreground">Notes are not available here</p>}
        </>
      )}
      <ConfirmDialog open={state.confirming} title="Delete this contact?" confirmLabel="Delete" destructive
        onConfirm={() => void (can({ type: "erase", clear: safe }) && send({ type: "erase", clear: safe }))} onCancel={() => void (can({ type: "keep" }) && send({ type: "keep" }))} />
    </div>
  );
}

function contactLabel(kind: string) {
  return kind.startsWith("custom:") ? kind.slice("custom:".length) : kind.replaceAll("-", " ");
}

const problems: Record<NonNullable<Book["problem"]>, string> = {
  "empty-contact": "Add a name, number or email.",
  "invalid-name": "Check the name.",
  "invalid-notes": "Check the notes.",
  "too-many-fields": "Too many numbers or emails.",
  "invalid-number": "Check the phone numbers.",
  "invalid-address": "Check the email addresses.",
  "invalid-type": "Check the phone and email labels.",
  stale: "This contact changed. Close and reopen the editor to review the latest fields.",
  "not-found": "This contact is no longer on this phone.",
};

const nameField = "min-h-14 rounded-tile border-0 bg-secondary px-4.5 text-lg";

interface ContactValuesProps {
  kind: "Phone" | "Email";
  values: readonly string[];
  locked: boolean;
  change(values: readonly string[]): void;
}

/** A phone or email field, with room for the owner to add and remove entries. */
function ContactValues({ kind, values, locked, change }: ContactValuesProps) {
  const phone = kind === "Phone";
  return (
    <>
      {values.map((value, at) => {
        const label = at === 0 ? kind : `${kind} ${at + 1}`;
        const remaining = values.filter((_, index) => index !== at);
        return (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- The editor keeps focus on the slot when its value changes.
          <div key={at} className="flex min-h-14 items-center gap-1 rounded-tile bg-secondary pl-4.5 pr-1.5">
            <Input className="border-0 bg-transparent text-lg shadow-none" type={phone ? "tel" : "email"} autoComplete="off" disabled={locked}
              maxLength={phone ? CONTACT_MAX_NUMBER : CONTACT_MAX_ADDRESS} aria-label={label} placeholder={label} value={value}
              onChange={(event) => change(values.map((one, index) => index === at ? event.target.value : one))} />
            {(value !== "" || values.length > 1) && <Button type="button" size="icon" variant="ghost" disabled={locked}
              aria-label={`Remove ${label.toLowerCase()}`} onClick={() => change(remaining.length === 0 ? [""] : remaining)}><Minus /></Button>}
          </div>
        );
      })}
    </>
  );
}

/** The form that adds a contact or changes one: a name, several numbers and addresses, and notes where they are available. */
function Editor({ runtime }: ContactsProps) {
  const { state, can, send } = useContacts(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone) return null;
  const { form, problem } = runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get()));
  const safe = clear(phone);
  const locked = pending(state);
  const canSave = problem !== "stale" && problem !== "not-found" && can({ type: "save", clear: safe });
  const update = (next: Form, part: "Names" | "Phones" | "Emails" | "Notes") => {
    const sheet = sheetOf(next);
    const count = part === "Names" ? sheet.names : part === "Phones" ? sheet.phones : part === "Emails" ? sheet.emails : sheet.notes;
    const event = { type: "fill", part, count } as const;
    if (!can(event)) return;
    runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({ form: next, problem: problem === "stale" || problem === "not-found" ? problem : undefined })));
    void send(event);
  };
  const title = state.form === "Adding" ? "New contact" : "Edit contact";
  return (
    <form aria-label={title} noValidate className="flex flex-1 flex-col gap-2.5 px-4 pb-8" onSubmit={(event) => {
      event.preventDefault();
      if (canSave) void send({ type: "save", clear: safe });
    }}>
      <AppHeader title={title} className="-mx-4 [&_h1]:sr-only" leading={<Button type="button" variant="ghost" size="icon" aria-label="Cancel" disabled={!can({ type: "discard" })} onClick={() => void send({ type: "discard" })}><X /></Button>}>
        <Button type="submit" aria-label="Save" className="min-w-16" disabled={!canSave}><Check /></Button>
      </AppHeader>
      {locked && <Banner>Contact change pending</Banner>}
      {refused(state) && <Banner variant="destructive">{problem === undefined ? "The phone did not save the contact" : problems[problem]}</Banner>}
      <Input className={nameField} aria-label="First name" placeholder="First name" autoCapitalize="words" autoComplete="off" maxLength={CONTACT_MAX_NAME} disabled={locked} value={form.givenName} onChange={(event) => update({ ...form, givenName: event.target.value }, "Names")} />
      <Input className={nameField} aria-label="Last name" placeholder="Last name" autoCapitalize="words" autoComplete="off" maxLength={CONTACT_MAX_NAME} disabled={locked} value={form.familyName} onChange={(event) => update({ ...form, familyName: event.target.value }, "Names")} />
      <ContactValues kind="Phone" locked={locked} values={form.phones} change={(phones) => update({ ...form, phones }, "Phones")} />
      <ContactValues kind="Email" locked={locked} values={form.emails} change={(emails) => update({ ...form, emails }, "Emails")} />
      {state.sheet.notable ? <Textarea className="min-h-24 rounded-tile border-0 bg-secondary px-4.5 py-3.5 text-lg" aria-label="Notes" placeholder="Notes" maxLength={CONTACT_MAX_NOTES} disabled={locked} value={form.notes} onChange={(event) => update({ ...form, notes: event.target.value }, "Notes")} />
        : <p className="rounded-tile bg-secondary px-4.5 py-3.5 text-muted-foreground">Use Android Contacts to change notes for this contact.</p>}
      <div className="flex flex-wrap gap-2">
        {form.phones.length < maxEach && <Button type="button" variant="ghost" disabled={locked} className="flex-1 text-muted-foreground" onClick={() => update({ ...form, phones: [...form.phones, ""] }, "Phones")}>Add another phone</Button>}
        {form.emails.length < maxEach && <Button type="button" variant="ghost" disabled={locked} className="flex-1 text-muted-foreground" onClick={() => update({ ...form, emails: [...form.emails, ""] }, "Emails")}>Add another email</Button>}
      </div>
    </form>
  );
}
