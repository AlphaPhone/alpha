// spec/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/telephony/contacts.md, "Story: Change only the contact I reviewed"; spec/telephony/contacts.md, "Story: Let Alpha show me matching contacts"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { ArrowLeft, Mail, MessageSquare, Pencil, Phone as PhoneIcon, Plus, RotateCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMachine as useContactsMachine } from "../../../gen/telephony__contacts.react.ts";
import { initial as contactsInitial, visibleRows, type Contacts } from "../../../gen/telephony__contacts.ts";
import { ContactsView } from "../../telephony/contacts.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Avatar, Button, EmptyState, Input, ListRow } from "../components/ui/index.ts";
import { openApp } from "./open.ts";
import { CommsBar } from "./CommsBar.tsx";
import { ContactEditor } from "./ContactEditor.tsx";
import { contactsNoticeText, displayNumber, isAskSentence, typeLabel } from "./present.ts";
import { runtime, type TelephonyRuntime } from "./runtime.ts";
import { useComms } from "./useComms.ts";

export interface ContactDetailViewProps {
  /** Contacts' state with a contact open. */
  contacts: Contacts;
  /** Call or Message a number: Phone or Messages opens with it filled in; nothing dials or sends here. */
  onCall: (number: string) => void;
  onMessage: (number: string) => void;
  /** Edit, ask to delete, cancel or confirm. */
  onEdit: () => void;
  onDeleteAsked: () => void;
  onDeleteDeclined: () => void;
  onDeleteConfirmed: () => void;
}

/**
 * One contact as the phone holds it now: name, numbers and emails with their types, notes, Call and Message per number.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactDetailView({ contacts, onCall, onMessage, onEdit, onDeleteAsked, onDeleteDeclined, onDeleteConfirmed }: ContactDetailViewProps) {
  const row = visibleRows(contacts).find((r) => r.id === contacts.openId);
  const detail = contacts.detail.tag === "DetailRead" ? contacts.detail : undefined;
  const name = detail?.displayName || row?.title || "Unnamed contact";
  const phones = detail ? detail.phoneFields : (row?.phones ?? []).map((number) => ({ number, phoneType: "" }));
  const emails = detail ? detail.emailFields : (row?.emails ?? []).map((address) => ({ address, emailType: "" }));
  const busy = contacts.writeKind !== "NoWrite";
  const canDelete = contacts.writable && contacts.gate === "WriteIdle" && !!detail;
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4">
      <Avatar name={name} size="lg" />
      <h2 className="font-serif text-2xl">{name}</h2>
      <ul className="w-full divide-y divide-border">
        {phones.map((p) => (
          <li key={p.number} className="flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1">
              <span className="block">{displayNumber(p.number)}</span>
              {p.phoneType && <span className="block font-mono text-xs uppercase text-muted-foreground">{typeLabel(p.phoneType, false)}</span>}
            </span>
            <Button variant="secondary" size="icon" aria-label={`Call ${p.number}`} onClick={() => onCall(p.number)}><PhoneIcon aria-hidden /></Button>
            <Button variant="secondary" size="icon" aria-label={`Message ${p.number}`} onClick={() => onMessage(p.number)}><MessageSquare aria-hidden /></Button>
          </li>
        ))}
        {emails.map((e) => (
          <li key={e.address} className="flex items-center gap-2 py-2">
            <Mail aria-hidden className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{e.address}</span>
              {e.emailType && <span className="block font-mono text-xs uppercase text-muted-foreground">{typeLabel(e.emailType, true)}</span>}
            </span>
          </li>
        ))}
        {detail?.notes && (
          <li className="py-2">
            <span className="block font-mono text-xs uppercase text-muted-foreground">Notes</span>
            <p className="whitespace-pre-wrap">{detail.notes}</p>
          </li>
        )}
      </ul>
      <div className="flex w-full justify-end gap-2">
        <Button variant="secondary" disabled={busy || contacts.gate !== "WriteIdle"} onClick={onEdit}><Pencil aria-hidden />Edit</Button>
        {contacts.confirming ? (
          <>
            <Button variant="ghost" disabled={busy} onClick={onDeleteDeclined}>Cancel</Button>
            <Button variant="destructive" loading={contacts.writeKind === "DeletingWrite"} onClick={onDeleteConfirmed}>Delete</Button>
          </>
        ) : (
          canDelete && <Button variant="ghost" size="icon" aria-label={`Delete ${name}`} disabled={busy} onClick={onDeleteAsked}><Trash2 aria-hidden /></Button>
        )}
      </div>
    </div>
  );
}

export interface ContactsScreenProps extends ScreenProps {
  /** The runtime the screen runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * Contacts on the Alpha image: the list for the query on screen, one contact, the editor, and the one bar.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactsScreen({ route, runtime: on = runtime }: ContactsScreenProps) {
  const { state: c = contactsInitial, send, can } = useContactsMachine(on);
  const stage = useComms(on);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let visit = on.runFork(ContactsView.use((v) => v.visit()));
    if (route?.startsWith("filter:")) on.runFork(ContactsView.use((v) => v.alphaFilter(route.slice(7), route.slice(7))));
    stage.show("ContactsApp", "ListSubject", "contacts:list:");
    const visibility = () => {
      visit.interruptUnsafe();
      if (!document.hidden) visit = on.runFork(ContactsView.use((v) => v.visit()));
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      visit.interruptUnsafe();
    };
  }, [on, route]);
  const rows = visibleRows(c);
  const editor = c.editor.tag === "EditorOpen" ? c.editor : undefined;
  const open = c.openId !== "" ? rows.find((r) => r.id === c.openId) : undefined;
  const chatOpen = stage.comms.height !== "SheetClosed";
  const notice = contactsNoticeText(c.notice) || (c.gate === "WriteUnsettled" ? "Outcome unknown · refresh Contacts" : "");
  const read = (query: string, explicit = false) => on.runFork(ContactsView.use((v) => v.read(query, explicit)));
  const back = () => {
    if (stage.back()) return;
    if (editor) can({ type: "editorClosed" }) && send({ type: "editorClosed" });
    else if (c.confirming) send({ type: "deleteDeclined" });
    else if (c.openId) {
      send({ type: "contactClosed" });
      stage.show("ContactsApp", "ListSubject", "contacts:list:");
    } else if (c.chip) on.runFork(ContactsView.use((v) => v.clearChip()));
    else if (searching) {
      setSearching(false);
      read("");
    }
  };
  const person = open?.title ?? "";
  return (
    <section aria-label="Contacts" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || editor || route === "from:phone") && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => (open || editor ? back() : openApp("phone", "recents"))}><ArrowLeft aria-hidden /></Button>}
        {searching ? (
          <Input autoFocus aria-label="Search contacts" value={c.query} onChange={(event) => read(event.target.value)} className="flex-1" />
        ) : (
          <h1 className="flex-1 font-serif text-2xl">{editor ? (editor.mode === "Creating" ? "New contact" : "Edit contact") : "Contacts"}</h1>
        )}
        {!open && !editor && !searching && <Button variant="ghost" size="icon" aria-label="Search contacts" onClick={() => setSearching(true)}><Search aria-hidden /></Button>}
        {!open && !editor && (
          <Button variant="ghost" size="icon" aria-label="Add a contact" disabled={c.writeKind !== "NoWrite" || c.gate !== "WriteIdle"} onClick={() => on.runFork(ContactsView.use((v) => v.edit("Creating")))}><Plus aria-hidden /></Button>
        )}
      </header>
      {notice && <p role="status" className="px-4 text-sm text-muted-foreground">{notice}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {editor && (
          <ContactEditor
            key={`${editor.mode}:${editor.editId}:${editor.editVersion}`}
            editor={editor}
            detail={c.detail}
            saving={c.writeKind === "SavingWrite"}
            onEdited={() => can({ type: "edited" }) && send({ type: "edited" })}
            onSave={(draft) => on.runFork(ContactsView.use((v) => v.save(draft)))}
            onCancel={() => can({ type: "editorClosed" }) && send({ type: "editorClosed" })}
          />
        )}
        {!editor && open && (
          <ContactDetailView
            contacts={c}
            onCall={(number) => openApp("phone", `keypad:${number}`)}
            onMessage={(number) => openApp("messages", `compose:${number}`)}
            onEdit={() => on.runFork(ContactsView.use((v) => v.edit("Editing")))}
            onDeleteAsked={() => can({ type: "deleteAsked" }) && send({ type: "deleteAsked" })}
            onDeleteDeclined={() => send({ type: "deleteDeclined" })}
            onDeleteConfirmed={() => on.runFork(ContactsView.use((v) => v.remove()))}
          />
        )}
        {!editor && !open && (
          <>
            {c.chip && (
              <div className="px-4 py-2">
                <Button variant="secondary" size="sm" aria-label={`Clear filter ${c.chip}`} onClick={() => on.runFork(ContactsView.use((v) => v.clearChip()))}>{c.chip} · {rows.length}<X aria-hidden /></Button>
              </div>
            )}
            {!c.readable && !c.loading && <EmptyState title="Allow Contacts"><Button onClick={() => on.runFork(ContactsView.use((v) => v.allow()))}>Allow</Button></EmptyState>}
            {c.failed && <EmptyState title="Couldn’t load"><Button variant="secondary" aria-label="Refresh" onClick={() => read(c.query, true)}><RotateCw aria-hidden /></Button></EmptyState>}
            {c.readable && !c.loading && rows.length === 0 && c.rowsQuery === c.query && c.gate === "WriteIdle" && <EmptyState title={c.query ? "No contacts found" : "No contacts yet"} />}
            {c.gate === "WriteUnsettled" && <Button variant="secondary" onClick={() => read(c.query, true)}>Refresh Contacts</Button>}
            <ul className="divide-y divide-border">
              {rows.map((row, index) => {
                const name = row.complete ? row.title || "Unnamed contact" : "Contact content unavailable";
                const letter = name[0]?.toUpperCase() ?? "#";
                const heading = rows.length >= 20 && (index === 0 || (rows[index - 1]!.title[0]?.toUpperCase() ?? "#") !== letter);
                return (
                  <li key={row.id}>
                    {heading && <h2 className="px-4 pt-3 font-mono text-xs uppercase text-muted-foreground">{letter}</h2>}
                    <ListRow
                      title={name}
                      leading={<Avatar name={name} />}
                      disabled={!row.complete}
                      onClick={() => {
                        if (!can({ type: "contactOpened", contactId: row.id })) return;
                        on.runFork(ContactsView.use((v) => v.open(row.id)));
                        stage.show("ContactsApp", "ContactSubject", `contacts:contact:${row.id}`);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            {c.more && c.limit < 200 && <Button variant="ghost" onClick={() => on.runFork(ContactsView.use((v) => v.more()))}>Load more</Button>}
            {c.more && c.limit >= 200 && <p className="px-4 py-2 text-sm text-muted-foreground">200 shown. Search to find other contacts.</p>}
          </>
        )}
      </div>
      <CommsBar
        comms={stage.comms}
        person={person}
        value={chatOpen ? stage.request : open ? stage.request : c.chip ? "" : c.query}
        onText={(text) => (chatOpen || open ? stage.setRequest(text) : read(text))}
        canSubmit={chatOpen || open ? stage.request.trim() !== "" : isAskSentence(c.query)}
        onSubmit={() => {
          if (chatOpen) stage.submitRequest();
          else if (open) {
            stage.openAlpha();
            stage.submitRequest();
          } else {
            stage.ask(c.query);
            read("");
          }
        }}
        onAlpha={stage.openAlpha}
        onBack={stage.closeChat}
      />
    </section>
  );
}
