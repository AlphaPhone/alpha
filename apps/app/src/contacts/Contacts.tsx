// spec/app/contacts/index.md, "Story: Browse my contacts"; spec/app/contacts/index.md, "Story: Give Alpha access to my contacts"; spec/app/contacts/index.md, "Story: Look at one contact"; spec/app/contacts/index.md, "Story: Add or change a contact"; spec/app/contacts/index.md, "Story: Delete a contact"; spec/app/contacts/index.md, "Story: Know what happened to my change"
import { Alert, AppHeader, Avatar, Banner, Button, Chip, ConfirmDialog, Input, ListGroup, ListRow, SearchField, Spinner, Tabs, TabsContent, Textarea } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { ArrowLeft, ChevronDown, Mail, MessageSquare, Pencil, Phone as Call, Plus, Search, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Machine as ContactsMachine } from "../../gen/app__contacts.effect.vibe";
import { accessNeeded, listFailed, listedEmpty, noMatches, pending, refused, shown, uncertain } from "../../gen/app__contacts.ts";
import { useMachine as useContacts } from "../../gen/app__contacts.react.ts";
import type { Machine as PhoneMachine, Tab } from "../../gen/app__phone.effect.vibe";
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
  const [query, setQuery] = useState(() => runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get())).sought);
  const [searching, setSearching] = useState(false);
  if (contacts.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Contacts</Alert>;
  const { state, can, send } = contacts;
  if (!state || !phone) return null;
  const held = runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get()));
  const set = (change: Partial<Book>) => runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set(change)));
  const search = (typed: string) => {
    setQuery(typed);
    set({ sought: typed });
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (can(event)) void send(event);
  };
  const safe = clear(phone);
  if (state.form !== "Shut") return <Editor runtime={runtime} />;
  const open = (id: string) => {
    set({ card: undefined });
    void send({ type: "openContact", contact: id });
  };
  const groups = Object.groupBy(held.rows, (row) => Array.from(row.name.trim())[0]?.toLocaleUpperCase() ?? "#");
  const canBack = shell.can({ type: "goBack" });
  const phoneTabs = !state.opened && shell.state?.trail.at(-2) === "Phone";
  const back = canBack ? () => void alpha.back() : undefined;
  const select = async (tab: string) => {
    if (tab === "Contacts" || !canBack) return;
    const event = { type: "pickTab", tab: tab as Tab } as const;
    if (dialer.can(event)) await dialer.send(event);
    await shell.send({ type: "goBack" });
  };
  const actions = (
    <>
      <Button variant="ghost" size="icon" aria-label="Search contacts" onClick={() => setSearching(true)}><Search className="size-5" /></Button>
      {can({ type: "compose" }) && <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => { set({ form: blankForm }); void send({ type: "compose" }); }}><Plus className="size-5" /></Button>}
      {can({ type: "composeElsewhere" }) && <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => void send({ type: "composeElsewhere" })}><Plus className="size-5" /></Button>}
    </>
  );
  const header = searching ? (
    <form role="search" aria-label="Search contacts" data-host-chrome="" className="flex min-h-14 items-center px-2" onSubmit={(event) => event.preventDefault()}>
      <Button variant="ghost" size="icon" aria-label="Back to contacts" onClick={() => { search(""); setSearching(false); }}><ArrowLeft className="size-5" /></Button>
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
          {state.sought && !searching && <Chip className="mx-4 self-start" onClear={() => search("")} clearLabel="Clear the search">{query}</Chip>}
          {searching && <div className="flex gap-2 px-4" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "Everyone" ? "primary" : "outline"} disabled={!can({ type: "pick", chip: "Everyone" }) && state.chip !== "Everyone"} onClick={() => void send({ type: "pick", chip: "Everyone" })}>All</Button>
            <Button size="sm" variant={state.chip === "Favourites" ? "primary" : "outline"} disabled={!can({ type: "pick", chip: "Favourites" }) && state.chip !== "Favourites"} onClick={() => void send({ type: "pick", chip: "Favourites" })}>Favourites</Button>
          </div>}
          {state.list.status === "Loading" && state.rows === 0 && <Spinner label="Reading contacts" />}
          {listFailed(state) && <Banner variant="destructive" action={can({ type: "refresh" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh" })}>Retry</Button>}>Contacts could not be read</Banner>}
          {listedEmpty(state) && <p role="status" className="flex min-h-45 flex-1 items-center justify-center p-6 text-center text-muted-foreground">No contacts</p>}
          {noMatches(state) && <p role="status" className="mx-5 my-3 text-muted-foreground">No matches</p>}
          {state.rows > 0 && (
            <ListGroup aria-label="Contacts" surface="plain">
              {!searching && held.rows.some((row) => row.starred) && <div className="flex touch-pan-x gap-1.5 overflow-x-auto px-3.5 pt-2 pb-2.5" role="group" aria-label="Favourites">
                {held.rows.filter((row) => row.starred).map((row) => (
                  <Button key={row.id} variant="ghost" aria-label={`Open favourite ${row.name}`} className="h-auto w-18 flex-col gap-1.5 rounded-tile p-0" disabled={!can({ type: "openContact", contact: row.id })} onClick={() => open(row.id)}>
                    <Avatar name={row.name} className="size-15 text-lg font-bold" />
                    <span className="w-full truncate text-sm font-normal">{row.name.trim().split(/\s+/, 1)[0]}</span>
                  </Button>
                ))}
              </div>}
              {Object.entries(groups).map(([letter, rows]) => (
                <div key={letter}>
                  <h2 className="px-6 pt-3 pb-0.5 text-sm font-semibold text-muted-foreground">{letter}</h2>
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
        {can({ type: "favour", clear: safe }) && <Button variant="ghost" size="icon" aria-pressed={card?.starred ?? false} aria-label={card?.starred ? "Remove from favourites" : "Add to favourites"} onClick={() => void send({ type: "favour", clear: safe })}><Star className={card?.starred ? "fill-current" : undefined} /></Button>}
        {card && can({ type: "amend" }) && <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => {
          runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({ form: { givenName: card.givenName, familyName: card.familyName, phones: card.phoneNumbers.map((one) => one.number), emails: card.emailAddresses.map((one) => one.address), notes: card.notes ?? "" } })));
          void send({ type: "amend" });
        }}><Pencil /></Button>}
        {can({ type: "amendElsewhere" }) && <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => void send({ type: "amendElsewhere" })}><Pencil /></Button>}
        {can({ type: "askDelete" }) && <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete" onClick={() => void send({ type: "askDelete" })}><Trash2 /></Button>}
      </div>
      {state.card.status === "Loading" && <Spinner label="Reading the contact" />}
      {state.card.status === "Failed" && <Banner variant="destructive">The contact could not be read</Banner>}
      {shown(state) && card && (
        <>
          <Avatar name={card.displayName} aria-hidden className="size-22 self-center font-display text-3xl font-light" />
          <h1 className="px-4 text-center font-display text-3xl font-light break-words">{card.displayName}</h1>
          <div className="flex flex-wrap justify-center gap-2 px-4 pt-2" role="group" aria-label="Contact actions">
            {card.phoneNumbers.flatMap(({ number }) => [
              can({ type: "reach", how: "Call" }) && <Button key={`call ${number}`} variant="secondary" size="icon" className="size-14" aria-label={`Call ${number}`} onClick={() => reach("Call", number)}><Call /></Button>,
              can({ type: "reach", how: "Message" }) && <Button key={`message ${number}`} variant="secondary" size="icon" className="size-14" aria-label={`Message ${number}`} onClick={() => reach("Message", number)}><MessageSquare /></Button>,
            ])}
          </div>
          <ListGroup surface="plain" aria-label="Contact details" className="mx-4 mt-5 rounded-sheet bg-secondary">
            {card.phoneNumbers.map((phone, at) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- The phone can return a duplicated number at distinct positions.
              <ListRow key={`${phone.number}-${at}`} title={phone.number} detail={phone.type}
                leading={<Call className="size-5" />} className="min-h-13.5 px-5 select-text" />
            ))}
            {card.emailAddresses.map((email, at) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- The phone can return a duplicated address at distinct positions.
              <ListRow key={`${email.address}-${at}`} title={email.address} detail={email.type} leading={<Mail className="size-5" />} className="min-h-13.5 px-5 select-text" />
            ))}
            {card.notes && <ListRow title={card.notes} className="min-h-13.5 px-5 select-text" />}
          </ListGroup>
          {card.notes === undefined && <p className="mx-4 text-sm text-muted-foreground">Notes are not available here</p>}
        </>
      )}
      <ConfirmDialog open={state.confirming} title="Delete this contact?" confirmLabel="Delete" destructive
        onConfirm={() => void (can({ type: "erase", clear: safe }) && send({ type: "erase", clear: safe }))} onCancel={() => void (can({ type: "keep" }) && send({ type: "keep" }))} />
    </div>
  );
}

/** The form that adds a contact or changes one: a name, several numbers and addresses, and notes where they are available. */
function Editor({ runtime }: ContactsProps) {
  const { state, can, send } = useContacts(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone) return null;
  const form = runtime.runSync(Effect.flatMap(Rows, (rows) => rows.get())).form;
  const safe = clear(phone);
  const update = (next: Form, part: "Names" | "Phones" | "Emails" | "Notes") => {
    const sheet = sheetOf(next);
    const count = part === "Names" ? sheet.names : part === "Phones" ? sheet.phones : part === "Emails" ? sheet.emails : sheet.notes;
    const event = { type: "fill", part, count } as const;
    if (!can(event)) return;
    runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({ form: next })));
    void send(event);
  };
  const list = (values: ReadonlyArray<string>, at: number, value: string) => values.map((one, index) => (index === at ? value : one));
  const title = state.form === "Adding" ? "New contact" : "Edit contact";
  const field = "min-h-14 rounded-tile border-0 bg-secondary px-4.5 text-lg";
  return (
    <form aria-label={title} className="flex flex-1 flex-col gap-3 px-4" onSubmit={(event) => {
      event.preventDefault();
      if (can({ type: "save", clear: safe })) void send({ type: "save", clear: safe });
    }}>
      <AppHeader title={title} className="-mx-4" leading={can({ type: "discard" }) && <Button type="button" variant="ghost" onClick={() => { runtime.runSync(Effect.flatMap(Rows, (rows) => rows.set({ form: blankForm }))); void send({ type: "discard" }); }}>Cancel</Button>}>
        <Button type="submit" disabled={!can({ type: "save", clear: safe })}>Save</Button>
      </AppHeader>
      {pending(state) && <Banner>Contact change pending</Banner>}
      {refused(state) && <Banner variant="destructive">The phone did not save the contact</Banner>}
      <Input className={field} aria-label="First name" placeholder="First name" value={form.givenName} onChange={(event) => update({ ...form, givenName: event.target.value }, "Names")} />
      <Input className={field} aria-label="Last name" placeholder="Last name" value={form.familyName} onChange={(event) => update({ ...form, familyName: event.target.value }, "Names")} />
      {form.phones.map((number, at) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- Each editor slot keeps its position and focus as its text changes.
        <Input key={`phone-${at}`} className={field} aria-label={`Phone ${at + 1}`} placeholder={`Phone ${at + 1}`} inputMode="tel" value={number} onChange={(event) => update({ ...form, phones: list(form.phones, at, event.target.value) }, "Phones")} />
      ))}
      {form.emails.map((address, at) => (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- Each editor slot keeps its position and focus as its text changes.
        <Input key={`email-${at}`} className={field} aria-label={`Email ${at + 1}`} placeholder={`Email ${at + 1}`} inputMode="email" value={address} onChange={(event) => update({ ...form, emails: list(form.emails, at, event.target.value) }, "Emails")} />
      ))}
      {state.sheet.notable && <Textarea className="min-h-24 rounded-tile border-0 bg-secondary px-4.5 py-3.5 text-lg" aria-label="Notes" placeholder="Notes" value={form.notes} onChange={(event) => update({ ...form, notes: event.target.value }, "Notes")} />}
      <div className="flex flex-wrap gap-2">
        {can({ type: "fill", part: "Phones", count: form.phones.length + 1 }) && <Button type="button" variant="ghost" className="flex-1 text-muted-foreground" onClick={() => update({ ...form, phones: [...form.phones, ""] }, "Phones")}>Add a phone number</Button>}
        {can({ type: "fill", part: "Emails", count: form.emails.length + 1 }) && <Button type="button" variant="ghost" className="flex-1 text-muted-foreground" onClick={() => update({ ...form, emails: [...form.emails, ""] }, "Emails")}>Add an email address</Button>}
      </div>
    </form>
  );
}
