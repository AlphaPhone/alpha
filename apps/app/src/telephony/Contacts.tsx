// spec/app/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/app/telephony/contacts.md, "Story: Change only the contact I reviewed"
import { contactDraftProblem } from "@elizaos/os/bridges/contacts";
import { normalizePhoneNumber } from "@elizaos/os/bridges/definitions/phone";
import { Alert, Avatar, Banner, Button, Chip, ConfirmDialog, EmptyState, Input, Label, ListGroup, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { MessageSquare, Phone as Call, Plus, Search } from "lucide-react";
import { useState } from "react";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { ContactDraft, Machine as ContactsMachine, Contacts as State } from "../../gen/app__telephony__contacts.effect.vibe";
import { detailFor, visibleRows } from "../../gen/app__telephony__contacts.ts";
import { useMachine as useContacts } from "../../gen/app__telephony__contacts.react.ts";
import type { Machine as DraftsMachine } from "../../gen/app__telephony__drafts.effect.vibe";
import { useMachine as useDrafts } from "../../gen/app__telephony__drafts.react.ts";
import type { Machine as MessagesMachine } from "../../gen/app__telephony__messages.effect.vibe";
import { useMachine as useMessages } from "../../gen/app__telephony__messages.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__telephony__phone.effect.vibe";
import { useMachine as usePhone } from "../../gen/app__telephony__phone.react.ts";

export interface ContactsProps {
  /** Provides the Contacts machine, and the shell, Phone, Messages and drafts it hands a number to. */
  runtime: ManagedRuntime.ManagedRuntime<ContactsMachine | ShellMachine | PhoneMachine | MessagesMachine | DraftsMachine, unknown>;
}

const notices = {
  NoContactsNotice: "", ChangedSinceShown: "This contact changed since you opened it. Look at it again.", ContactGone: "This contact is gone",
  NotWritten: "The contact was not changed", OutcomeUnknown: "Alpha cannot tell whether the contact changed. Refresh before changing contacts again.",
  DraftRefused: "Add a name, a number or an email, and check them", SystemEditorFailed: "The contacts app could not open",
} as const;

/**
 * Contacts: the address book for the query on screen, the open contact as the phone holds it, the editor and a
 * confirmed delete; Call and Message hand the number to Phone or Messages, where only the owner calls or sends.
 * @model spec/app/telephony/contacts.md
 */
export function Contacts({ runtime }: ContactsProps) {
  const { state, cause, can, send } = useContacts(runtime);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not open Contacts</Alert>;
  if (!state) return null;
  return (
    <section aria-label="Contacts" className="flex flex-col gap-3 p-4">
      {notices[state.notice] !== "" && <Banner variant="warn" action={state.unsettled && can({ type: "readAsked", query: state.query, explicit: true }) && <Button variant="outline" size="sm" onClick={() => void send({ type: "readAsked", query: state.query, explicit: true })}>Refresh</Button>}>{notices[state.notice]}</Banner>}
      {state.editor.tag === "EditorOpen" ? <Editor state={state} runtime={runtime} /> : state.openId !== "" ? <Contact state={state} runtime={runtime} /> : <List state={state} runtime={runtime} />}
    </section>
  );
}

function List({ state, runtime }: { state: State; runtime: ContactsProps["runtime"] }) {
  const { can, send } = useContacts(runtime);
  const rows = visibleRows(state);
  const create = { type: "editorOpened", mode: "Creating", editId: "", editVersion: "" } as const;
  return (
    <>
      <div className="flex items-center gap-2">
        {state.searching
          ? <SearchField autoFocus aria-label="Search contacts" placeholder="Search or ask" className="flex-1" value={state.chip === "" ? state.query : ""} onValueChange={(query) => void send({ type: "readAsked", query, explicit: false })} />
          : can({ type: "searchOpened" }) && <Button variant="ghost" size="icon" aria-label="Search" onClick={() => void send({ type: "searchOpened" })}><Search /></Button>}
        {can(create) ? <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => void send(create)}><Plus /></Button>
          : can({ type: "systemEditorOpened" }) && <Button variant="ghost" size="icon" aria-label="New contact" onClick={() => void send({ type: "systemEditorOpened" })}><Plus /></Button>}
      </div>
      {state.chip !== "" && <Chip onClear={() => void send({ type: "chipCleared" })} clearLabel="Clear Alpha's filter">{state.chip}</Chip>}
      {state.contacts.grant === "Denied" && (
        <Banner variant="warn" action={can({ type: "allow" }) && <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button>}>
          {can({ type: "allow" }) ? "Contacts needs access to your address book" : "Allow contacts access for Alpha in Android's settings"}
        </Banner>
      )}
      {state.list.status === "Failed" && <Banner variant="destructive">Contacts could not be read</Banner>}
      {state.list.status === "Loading" && rows.length === 0 && <Spinner label="Reading contacts" />}
      {state.list.status === "Loaded" && state.contacts.grant === "Granted" && rows.length === 0 && <EmptyState title={state.query === "" ? "No contacts" : "No matching contacts"} />}
      {rows.length > 0 && (
        <ListGroup aria-label="Contacts list">
          {rows.map((row) => (
            <ListRow key={row.id} aria-label={row.complete ? row.title : "A contact Alpha cannot show"} leading={<Avatar name={row.title || "?"} size="sm" />} title={row.complete ? row.title : "A contact Alpha cannot show"} detail={row.phones[0] ?? row.emails[0]}
              disabled={!can({ type: "contactOpened", contactId: row.id })} onClick={() => void send({ type: "contactOpened", contactId: row.id })} />
          ))}
        </ListGroup>
      )}
      {can({ type: "moreAsked" }) && <Button variant="outline" onClick={() => void send({ type: "moreAsked" })}>Load more</Button>}
    </>
  );
}

function Contact({ state, runtime }: { state: State; runtime: ContactsProps["runtime"] }) {
  const { can, send } = useContacts(runtime);
  const shell = useShell(runtime);
  const phone = usePhone(runtime);
  const messages = useMessages(runtime);
  const drafts = useDrafts(runtime);
  const { detail } = state;
  if (detail.tag !== "DetailRead" || !detailFor(detail, state.openId)) return <Spinner label="Reading the contact" />;
  const edit = { type: "editorOpened", mode: "Editing", editId: detail.contactId, editVersion: detail.version } as const;
  const call = (number: string) => {
    void phone.send({ type: "keypadAsked", number });
    if (shell.can({ type: "openView", view: "Phone" })) void shell.send({ type: "openView", view: "Phone" });
  };
  const message = (number: string) => {
    const to = { type: "recipientsChanged" as const, thread: "new", recipients: [number] };
    if (drafts.can(to, "Owner")) void drafts.send(to, "Owner");
    if (messages.can({ type: "composeOpened" })) void messages.send({ type: "composeOpened" });
    if (shell.can({ type: "openView", view: "Messages" })) void shell.send({ type: "openView", view: "Messages" });
  };
  return (
    <article aria-label={detail.displayName} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={detail.displayName || "?"} size="lg" />
        <h2 className="text-xl font-semibold">{detail.displayName}</h2>
      </div>
      <ListGroup aria-label="Numbers and addresses">
        {detail.phoneFields.map((field) => {
          const dialable = normalizePhoneNumber(field.number) !== null;
          return (
            <ListRow key={`phone ${field.number}`} title={field.number} detail={field.phoneType}
              trailing={dialable && (
                <span className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Call ${field.number}`} onClick={() => call(field.number)}><Call /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Message ${field.number}`} onClick={() => message(field.number)}><MessageSquare /></Button>
                </span>
              )} />
          );
        })}
        {detail.emailFields.map((field) => <ListRow key={`email ${field.address}`} title={field.address} detail={field.emailType} />)}
      </ListGroup>
      {detail.notes !== "" && <p className="whitespace-pre-wrap">{detail.notes}</p>}
      <div className="flex gap-2">
        {can(edit) ? <Button variant="outline" onClick={() => void send(edit)}>Edit</Button>
          : can({ type: "systemEditorOpened" }) && <Button variant="outline" onClick={() => void send({ type: "systemEditorOpened" })}>Edit</Button>}
        {can({ type: "deleteAsked" }) && <Button variant="destructive" onClick={() => void send({ type: "deleteAsked" })}>Delete</Button>}
      </div>
      <ConfirmDialog open={state.confirming} title={`Delete ${detail.displayName}?`} confirmLabel="Delete" destructive loading={state.writeKind === "DeletingWrite"}
        onConfirm={() => void send({ type: "deleteStarted" })} onCancel={() => void (can({ type: "deleteDeclined" }) && send({ type: "deleteDeclined" }))} />
    </article>
  );
}

/** The in-app editor: the fields are the screen's, and the rules say whether the edit may be saved. */
function Editor({ state, runtime }: { state: State; runtime: ContactsProps["runtime"] }) {
  const { can, send } = useContacts(runtime);
  const detail = state.detail.tag === "DetailRead" ? state.detail : undefined;
  const editing = state.editor.tag === "EditorOpen" && state.editor.mode === "Editing" ? detail : undefined;
  const [draft, setDraft] = useState<ContactDraft>(() => ({
    givenName: editing?.givenName ?? "", familyName: editing?.familyName ?? "",
    phones: editing?.phoneFields.map((field) => field.number) ?? [""], emails: editing?.emailFields.map((field) => field.address) ?? [""], notes: editing?.notes ?? "",
  }));
  const notesEditable = state.editor.tag === "EditorOpen" && state.editor.notesEditable;
  const change = (next: Partial<ContactDraft>) => {
    setDraft({ ...draft, ...next });
    if (can({ type: "edited" })) void send({ type: "edited" });
  };
  const written = { ...draft, phones: draft.phones.filter((one) => one !== ""), emails: draft.emails.filter((one) => one !== "") };
  const displayName = [written.givenName, written.familyName].filter((part) => part !== "").join(" ");
  const valid = contactDraftProblem({ displayName, givenName: written.givenName, familyName: written.familyName, phoneNumbers: written.phones.map((number) => ({ number, type: "mobile" })), emailAddresses: written.emails.map((address) => ({ address, type: "home" })) }, { create: editing === undefined }) === null;
  const save = { type: "saveStarted", valid, draft: written } as const;
  return (
    <form aria-label={editing ? "Edit contact" : "New contact"} className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); if (can(save)) void send(save); }}>
      <Label>First name<Input value={draft.givenName} onChange={(event) => change({ givenName: event.target.value })} /></Label>
      <Label>Last name<Input value={draft.familyName} onChange={(event) => change({ familyName: event.target.value })} /></Label>
      <Label>Phone<Input inputMode="tel" value={draft.phones[0] ?? ""} onChange={(event) => change({ phones: [event.target.value, ...draft.phones.slice(1)] })} /></Label>
      <Label>Email<Input inputMode="email" value={draft.emails[0] ?? ""} onChange={(event) => change({ emails: [event.target.value, ...draft.emails.slice(1)] })} /></Label>
      {notesEditable && <Label>Notes<Textarea value={draft.notes} onChange={(event) => change({ notes: event.target.value })} /></Label>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!can(save)} loading={state.writeKind === "SavingWrite"}>Save</Button>
        {can({ type: "editorClosed" }) && <Button variant="ghost" onClick={() => void send({ type: "editorClosed" })}>Cancel</Button>}
      </div>
    </form>
  );
}
