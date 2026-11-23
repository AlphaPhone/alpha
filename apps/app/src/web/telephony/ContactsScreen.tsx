// spec/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/telephony/contacts.md, "Story: Change only the contact I reviewed"; spec/telephony/contacts.md, "Story: Let Alpha show me matching contacts"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { ArrowLeft, Plus, RotateCw, Search, X } from "lucide-react";
import { useCallback } from "react";
import { useMachine as useContactsMachine } from "../../../gen/telephony__contacts.react.ts";
import { initial as contactsInitial, visibleRows } from "../../../gen/telephony__contacts.ts";
import { ContactsView } from "../../telephony/contacts.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { Avatar, Button, EmptyState, Input, ListRow } from "../components/ui/index.ts";
import { openApp } from "./open.ts";
import { CommsBar } from "./CommsBar.tsx";
import { RestoredProposal } from "./RestoredProposal.tsx";
import { ContactEditor } from "./ContactEditor.tsx";
import { ContactDetailView } from "./ContactDetailView.tsx";
import { contactsNoticeText, isAskSentence } from "./present.ts";
import { act, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { backIn } from "./back.ts";
import { useComms } from "./useComms.ts";

/** Contacts' screen props: the shell's route and close. */
export type ContactsScreenProps = ScreenProps;

/**
 * Contacts on the Alpha image: the list for the query on screen, one contact, the editor, and the one bar.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactsScreen({ route }: ContactsScreenProps) {
  const { state: c = contactsInitial, send, can } = useContactsMachine(runtime);
  const stage = useComms();
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(ContactsView.use((v) => v.visit(route)));
    stage.show("ContactsApp", "ListSubject", "contacts:list:");
    return stop;
  }, [route]);
  const rows = visibleRows(c);
  const editor = c.editor.tag === "EditorOpen" ? c.editor : undefined;
  const open = c.openId !== "" ? rows.find((r) => r.id === c.openId) : undefined;
  const chatOpen = stage.comms.height !== "SheetClosed";
  const notice = contactsNoticeText(c.notice) || (c.gate === "WriteUnsettled" ? "Outcome unknown · refresh Contacts" : "");
  const read = (query: string, explicit = false) => act(ContactsView.use((v) => v.read(query, explicit)));
  const back = () => void backIn("contacts");
  const person = open?.title ?? "";
  return (
    <section ref={visit} aria-label="Contacts" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || editor || route === "from:phone") && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => (open || editor ? back() : openApp("phone", "recents"))}><ArrowLeft aria-hidden /></Button>}
        {c.searching && !open && !editor ? (
          <Input autoFocus aria-label="Search contacts" value={c.query} onChange={(event) => read(event.target.value)} className="flex-1" />
        ) : (
          <h1 className="flex-1 font-display text-2xl">{editor ? (editor.mode === "Creating" ? "New contact" : "Edit contact") : "Contacts"}</h1>
        )}
        {!open && !editor && !c.searching && <Button variant="ghost" size="icon" aria-label="Search contacts" onClick={() => can({ type: "searchOpened" }) && send({ type: "searchOpened" })}><Search aria-hidden /></Button>}
        {!open && !editor && (
          <Button variant="ghost" size="icon" aria-label="Add a contact" disabled={c.writeKind !== "NoWrite" || c.gate !== "WriteIdle"} onClick={() => act(ContactsView.use((v) => v.edit("Creating")))}><Plus aria-hidden /></Button>
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
            onSave={(draft) => act(ContactsView.use((v) => v.save(draft)))}
            onCancel={() => can({ type: "editorClosed" }) && send({ type: "editorClosed" })}
          />
        )}
        {!editor && open && (
          <ContactDetailView
            contacts={c}
            onCall={(number) => openApp("phone", `keypad:${number}`)}
            onMessage={(number) => openApp("messages", `compose:${number}`)}
            onEdit={() => act(ContactsView.use((v) => v.edit("Editing")))}
            onDeleteAsked={() => can({ type: "deleteAsked" }) && send({ type: "deleteAsked" })}
            onDeleteDeclined={() => send({ type: "deleteDeclined" })}
            onDeleteConfirmed={() => act(ContactsView.use((v) => v.remove()))}
          />
        )}
        {!editor && !open && (
          <>
            {c.chip && (
              <div className="px-4 py-2">
                <Button variant="secondary" size="sm" aria-label={`Clear filter ${c.chip}`} onClick={() => act(ContactsView.use((v) => v.clearChip()))}>{c.chip} · {rows.length}<X aria-hidden /></Button>
              </div>
            )}
            {!c.readable && !c.loading && <EmptyState title="Allow Contacts"><Button onClick={() => act(ContactsView.use((v) => v.allow()))}>Allow</Button></EmptyState>}
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
                        act(ContactsView.use((v) => v.open(row.id)));
                        stage.show("ContactsApp", "ContactSubject", `contacts:contact:${row.id}`);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            {c.more && c.limit < 200 && <Button variant="ghost" onClick={() => act(ContactsView.use((v) => v.more()))}>Load more</Button>}
            {c.more && c.limit >= 200 && <p className="px-4 py-2 text-sm text-muted-foreground">200 shown. Search to find other contacts.</p>}
          </>
        )}
      </div>
      <RestoredProposal card={stage.card} onDismiss={stage.decline} />
      <CommsBar
        comms={stage.comms}
        person={person}
        value={chatOpen ? stage.request : open ? stage.request : c.chip ? "" : c.query}
        onText={(text) => (chatOpen || open ? stage.setRequest(text) : read(text))}
        canSubmit={chatOpen || open ? stage.request.trim() !== "" : isAskSentence(c.query)}
        onSubmit={() => {
          if (chatOpen) stage.submitRequest();
          else if (open) stage.submitRequest();
          else stage.askContacts(c.query);
        }}
        onAlpha={stage.openAlpha}
        onEnd={stage.endCall}
        onBack={stage.closeChat}
      />
    </section>
  );
}
