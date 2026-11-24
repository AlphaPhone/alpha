// spec/app/contacts/index.md, "Story: Browse my contacts"; spec/app/contacts/index.md, "Story: Give Alpha access to my contacts"; spec/app/contacts/index.md, "Story: Look at one contact"; spec/app/contacts/index.md, "Story: Add or change a contact"; spec/app/contacts/index.md, "Story: Delete a contact"; spec/app/contacts/index.md, "Story: Know what happened to my change"
import { Alert, Banner, Button, Chip, ConfirmDialog, EmptyState, Input, ListGroup, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowLeft, MessageSquare, Phone as Call, Plus, Star } from "lucide-react";
import { useState } from "react";
import type { Machine as ContactsMachine } from "../../gen/app__contacts.effect.vibe";
import { accessNeeded, listFailed, listedEmpty, noMatches, pending, refused, shown, uncertain } from "../../gen/app__contacts.ts";
import { useMachine as useContacts } from "../../gen/app__contacts.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { type Form, Rows, blankForm, sheetOf } from "./contacts.vibe";
import { CommsBar, type CommsServices } from "../phone/CommsBar.tsx";

export interface ContactsProps {
  /** Provides Contacts' machine, resident, Phone's, for whether a call may be an emergency call, and what Contacts counts. */
  runtime: ManagedRuntime.ManagedRuntime<ContactsMachine | PhoneMachine | Rows | CommsServices, unknown>;
}

/**
 * Contacts: the list with favourites and search, one contact as the phone holds it, and the form. Call and Message
 * open Phone or Messages with the number filled in; nothing is dialled or sent here.
 * @model spec/app/contacts/index.md
 */
export function Contacts({ runtime }: ContactsProps) {
  const contacts = useContacts(runtime);
  const phone = usePhone(runtime).state;
  const [query, setQuery] = useState(() => runtime.runSync(Rows.use((rows) => rows.get())).sought);
  if (contacts.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Contacts</Alert>;
  const { state, can, send } = contacts;
  if (!state || !phone) return null;
  const held = runtime.runSync(Rows.use((rows) => rows.get()));
  const set = (change: Parameters<Rows["set"]>[0]) => runtime.runSync(Rows.use((rows) => rows.set(change)));
  const search = (typed: string) => {
    setQuery(typed);
    set({ sought: typed });
    const event = { type: "search", typed: typed.trim() !== "" } as const;
    if (can(event)) void send(event);
  };
  const safe = clear(phone);
  if (state.form !== "Shut") return <Editor runtime={runtime} />;
  return (
    <section aria-label="Contacts" className="flex flex-col gap-3 p-4">
      {pending(state) && <Banner>Contact change pending</Banner>}
      {uncertain(state) && <Banner variant="warn" action={can({ type: "refresh" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh" })}>Refresh</Button>}>Outcome unknown: refresh</Banner>}
      {accessNeeded(state) && (
        <Banner variant="warn" action={can({ type: "allow" }) ? <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button> : can({ type: "openSettings" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "openSettings" })}>Open Settings</Button>}>
          Contacts needs access to your address book
        </Banner>
      )}
      {state.opened ? <Card runtime={runtime} safe={safe} /> : (
        <>
          <div className="flex items-center gap-2">
            <SearchField className="flex-1" aria-label="Search or ask" placeholder="Search or ask" value={query} onValueChange={search} />
            {can({ type: "compose" }) && <Button size="icon" aria-label="New contact" onClick={() => { set({ form: blankForm }); void send({ type: "compose" }); }}><Plus /></Button>}
            {can({ type: "composeElsewhere" }) && <Button size="icon" aria-label="New contact" onClick={() => void send({ type: "composeElsewhere" })}><Plus /></Button>}
          </div>
          {state.sought && <Chip onClear={() => search("")} clearLabel="Clear the search">{query}</Chip>}
          <div className="flex gap-2" role="group" aria-label="Show">
            <Button size="sm" variant={state.chip === "Everyone" ? "primary" : "outline"} disabled={!can({ type: "pick", chip: "Everyone" }) && state.chip !== "Everyone"} onClick={() => void send({ type: "pick", chip: "Everyone" })}>All</Button>
            <Button size="sm" variant={state.chip === "Favourites" ? "primary" : "outline"} disabled={!can({ type: "pick", chip: "Favourites" }) && state.chip !== "Favourites"} onClick={() => void send({ type: "pick", chip: "Favourites" })}>Favourites</Button>
          </div>
          {state.list.status === "Loading" && state.rows === 0 && <Spinner label="Reading contacts" />}
          {listFailed(state) && <Banner variant="destructive" action={can({ type: "refresh" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "refresh" })}>Retry</Button>}>Contacts could not be read</Banner>}
          {listedEmpty(state) && <EmptyState title="No contacts" />}
          {noMatches(state) && <EmptyState title="No matching contacts" />}
          {state.rows > 0 && (
            <ListGroup aria-label="Contacts">
              {held.rows.map((row) => (
                <ListRow key={row.id} aria-label={row.name} title={row.name} detail={row.phones[0] ?? row.emails[0] ?? ""} trailing={row.starred ? <Star aria-label="Favourite" className="size-4" /> : undefined}
                  disabled={!can({ type: "openContact", contact: row.id })} onClick={() => { set({ card: undefined }); void send({ type: "openContact", contact: row.id }); }} />
              ))}
            </ListGroup>
          )}
          {can({ type: "loadMore" }) && <Button variant="outline" onClick={() => void send({ type: "loadMore" })}>More contacts</Button>}
        </>
      )}
      <CommsBar runtime={runtime} />
    </section>
  );
}

/** One contact as the phone holds it now. */
function Card({ runtime, safe }: ContactsProps & { safe: boolean }) {
  const { state, can, send } = useContacts(runtime);
  if (!state) return null;
  const card = runtime.runSync(Rows.use((rows) => rows.get())).card;
  const reach = (how: "Call" | "Message", number: string) => {
    runtime.runSync(Rows.use((rows) => rows.set({ reach: number })));
    void send({ type: "reach", how });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {can({ type: "closeContact" }) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void send({ type: "closeContact" })}><ArrowLeft /></Button>}
        <h2 className="flex-1 truncate text-lg font-semibold">{card?.displayName ?? ""}</h2>
        {can({ type: "favour", clear: safe }) && <Button variant="ghost" size="icon" aria-label={card?.starred ? "Remove from favourites" : "Add to favourites"} onClick={() => void send({ type: "favour", clear: safe })}><Star className={card?.starred ? "fill-current" : undefined} /></Button>}
      </div>
      {state.card.status === "Loading" && <Spinner label="Reading the contact" />}
      {state.card.status === "Failed" && <Banner variant="destructive">The contact could not be read</Banner>}
      {shown(state) && card && (
        <>
          <ListGroup heading="Phone">
            {card.phoneNumbers.map((phone, at) => (
              <ListRow key={`${phone.number}-${at}`} title={phone.number} detail={phone.type}
                trailing={can({ type: "reach", how: "Call" }) && <span className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Call ${phone.number}`} onClick={() => reach("Call", phone.number)}><Call /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Message ${phone.number}`} onClick={() => reach("Message", phone.number)}><MessageSquare /></Button>
                </span>} />
            ))}
          </ListGroup>
          {card.emailAddresses.length > 0 && <ListGroup heading="Email">{card.emailAddresses.map((email, at) => <ListRow key={`${email.address}-${at}`} title={email.address} detail={email.type} />)}</ListGroup>}
          {card.notes === undefined ? <p className="text-sm text-muted-foreground">Notes are not available here</p> : card.notes !== "" && <ListGroup heading="Notes"><ListRow title={card.notes} /></ListGroup>}
          <div className="flex gap-2">
            {can({ type: "amend" }) && <Button variant="outline" onClick={() => {
              runtime.runSync(Rows.use((rows) => rows.set({ form: { givenName: card.givenName, familyName: card.familyName, phones: card.phoneNumbers.map((one) => one.number), emails: card.emailAddresses.map((one) => one.address), notes: card.notes ?? "" } })));
              void send({ type: "amend" });
            }}>Edit</Button>}
            {can({ type: "amendElsewhere" }) && <Button variant="outline" onClick={() => void send({ type: "amendElsewhere" })}>Edit</Button>}
            {can({ type: "askDelete" }) && <Button variant="destructive" onClick={() => void send({ type: "askDelete" })}>Delete</Button>}
          </div>
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
  const form = runtime.runSync(Rows.use((rows) => rows.get())).form;
  const safe = clear(phone);
  const update = (next: Form, part: "Names" | "Phones" | "Emails" | "Notes") => {
    const sheet = sheetOf(next);
    const count = part === "Names" ? sheet.names : part === "Phones" ? sheet.phones : part === "Emails" ? sheet.emails : sheet.notes;
    const event = { type: "fill", part, count } as const;
    if (!can(event)) return;
    runtime.runSync(Rows.use((rows) => rows.set({ form: next })));
    void send(event);
  };
  const list = (values: ReadonlyArray<string>, at: number, value: string) => values.map((one, index) => (index === at ? value : one));
  return (
    <form aria-label={state.form === "Adding" ? "New contact" : "Edit contact"} className="flex flex-col gap-3 p-4" onSubmit={(event) => {
      event.preventDefault();
      if (can({ type: "save", clear: safe })) void send({ type: "save", clear: safe });
    }}>
      {pending(state) && <Banner>Contact change pending</Banner>}
      {refused(state) && <Banner variant="destructive">The phone did not save the contact</Banner>}
      <Input aria-label="First name" value={form.givenName} onChange={(event) => update({ ...form, givenName: event.target.value }, "Names")} />
      <Input aria-label="Last name" value={form.familyName} onChange={(event) => update({ ...form, familyName: event.target.value }, "Names")} />
      {form.phones.map((number, at) => <Input key={`phone-${at}`} aria-label={`Phone ${at + 1}`} inputMode="tel" value={number} onChange={(event) => update({ ...form, phones: list(form.phones, at, event.target.value) }, "Phones")} />)}
      {can({ type: "fill", part: "Phones", count: form.phones.length + 1 }) && <Button type="button" variant="outline" onClick={() => update({ ...form, phones: [...form.phones, ""] }, "Phones")}>Add a phone number</Button>}
      {form.emails.map((address, at) => <Input key={`email-${at}`} aria-label={`Email ${at + 1}`} inputMode="email" value={address} onChange={(event) => update({ ...form, emails: list(form.emails, at, event.target.value) }, "Emails")} />)}
      {can({ type: "fill", part: "Emails", count: form.emails.length + 1 }) && <Button type="button" variant="outline" onClick={() => update({ ...form, emails: [...form.emails, ""] }, "Emails")}>Add an email address</Button>}
      {state.sheet.notable && <Textarea aria-label="Notes" value={form.notes} onChange={(event) => update({ ...form, notes: event.target.value }, "Notes")} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={!can({ type: "save", clear: safe })}>Save</Button>
        {can({ type: "discard" }) && <Button type="button" variant="ghost" onClick={() => { runtime.runSync(Rows.use((rows) => rows.set({ form: blankForm }))); void send({ type: "discard" }); }}>Cancel</Button>}
      </div>
    </form>
  );
}
