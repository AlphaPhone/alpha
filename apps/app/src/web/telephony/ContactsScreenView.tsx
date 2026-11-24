// spec/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/telephony/contacts.md, "Story: Change only the contact I reviewed"; spec/telephony/contacts.md, "Story: Let Alpha show me matching contacts"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { ArrowLeft, Plus, RotateCw, Search, X } from "lucide-react";
import type { Ref } from "react";
import { visibleRows, type Contacts } from "../../../gen/telephony__contacts.ts";
import { Avatar, Button, EmptyState, Input, ListRow } from "../components/ui/index.ts";
import { CommsBar } from "./CommsBar.tsx";
import { ContactDetailView } from "./ContactDetailView.tsx";
import { ContactEditor, type ContactEditorProps } from "./ContactEditor.tsx";
import { contactsNoticeText, isAskSentence } from "./present.ts";
import { RestoredProposal } from "./RestoredProposal.tsx";
import type { StageViewProps } from "./stage.ts";

export interface ContactsScreenViewProps extends StageViewProps {
  /** Where the container starts and ends Contacts' visit. */
  ref?: Ref<HTMLElement>;
  /** Contacts' state: the rows for the query, the open contact, the editor and the write gate. */
  contacts: Contacts;
  /** Contacts was opened from Phone's Contacts tab, so Back returns to Phone. */
  fromPhone: boolean;
  /** Back from the open contact or the editor. */
  onBack: () => void;
  /** Back to Phone's Recents. */
  onPhone: () => void;
  /** Read the list for a query; an explicit read settles a lost write. */
  onRead: (query: string, explicit?: boolean) => void;
  /** Open the search field. */
  onSearchOpened: () => void;
  /** Add a contact. */
  onAdd: () => void;
  /** The owner changed a field in the editor. */
  onEdited: () => void;
  /** Save the editor's draft. */
  onSave: ContactEditorProps["onSave"];
  /** Close the editor without saving. */
  onCancelEdit: () => void;
  /** Call or Message a number in Phone or Messages; nothing dials or sends here. */
  onCall: (number: string) => void;
  onMessage: (number: string) => void;
  /** Edit the open contact. */
  onEdit: () => void;
  /** Ask, cancel or confirm the open contact's removal. */
  onDeleteAsked: () => void;
  onDeleteDeclined: () => void;
  onDeleteConfirmed: () => void;
  /** Clear Alpha's filter. */
  onClearChip: () => void;
  /** Allow Contacts. */
  onAllow: () => void;
  /** Open a listed contact. */
  onOpenContact: (contactId: string) => void;
  /** Load the next page of contacts. */
  onMore: () => void;
  /** Enter on a list sentence: the question goes to Alpha on this subject. */
  onAskContacts: (query: string) => void;
}

/**
 * Contacts' list for the query on screen, one contact, the editor, and the one bar, as the state gives them.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactsScreenView({
  ref, contacts: c, fromPhone, comms, request, card,
  onBack, onPhone, onRead, onSearchOpened, onAdd, onEdited, onSave, onCancelEdit, onCall, onMessage, onEdit,
  onDeleteAsked, onDeleteDeclined, onDeleteConfirmed, onClearChip, onAllow, onOpenContact, onMore, onAskContacts,
  onRequest, onSubmitRequest, onAlpha, onEndCall, onCloseChat, onDecline,
}: ContactsScreenViewProps) {
  const rows = visibleRows(c);
  const editor = c.editor.tag === "EditorOpen" ? c.editor : undefined;
  const open = c.openId !== "" ? rows.find((r) => r.id === c.openId) : undefined;
  const chatOpen = comms.height !== "SheetClosed";
  const notice = contactsNoticeText(c.notice) || (c.gate === "WriteUnsettled" ? "Outcome unknown · refresh Contacts" : "");
  const person = open?.title ?? "";
  return (
    <section ref={ref} aria-label="Contacts" className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        {(open || editor || fromPhone) && <Button variant="ghost" size="icon" aria-label="Back" onClick={() => (open || editor ? onBack() : onPhone())}><ArrowLeft aria-hidden /></Button>}
        {c.searching && !open && !editor ? (
          <Input autoFocus aria-label="Search contacts" value={c.query} onChange={(event) => onRead(event.target.value)} className="flex-1" />
        ) : (
          <h1 className="flex-1 font-display text-2xl">{editor ? (editor.mode === "Creating" ? "New contact" : "Edit contact") : "Contacts"}</h1>
        )}
        {!open && !editor && !c.searching && <Button variant="ghost" size="icon" aria-label="Search contacts" onClick={onSearchOpened}><Search aria-hidden /></Button>}
        {!open && !editor && (
          <Button variant="ghost" size="icon" aria-label="Add a contact" disabled={c.writeKind !== "NoWrite" || c.gate !== "WriteIdle"} onClick={onAdd}><Plus aria-hidden /></Button>
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
            onEdited={onEdited}
            onSave={onSave}
            onCancel={onCancelEdit}
          />
        )}
        {!editor && open && (
          <ContactDetailView
            contacts={c}
            onCall={onCall}
            onMessage={onMessage}
            onEdit={onEdit}
            onDeleteAsked={onDeleteAsked}
            onDeleteDeclined={onDeleteDeclined}
            onDeleteConfirmed={onDeleteConfirmed}
          />
        )}
        {!editor && !open && (
          <>
            {c.chip && (
              <div className="px-4 py-2">
                <Button variant="secondary" size="sm" aria-label={`Clear filter ${c.chip}`} onClick={onClearChip}>{c.chip} · {rows.length}<X aria-hidden /></Button>
              </div>
            )}
            {!c.readable && !c.loading && <EmptyState title="Allow Contacts"><Button onClick={onAllow}>Allow</Button></EmptyState>}
            {c.failed && <EmptyState title="Couldn’t load"><Button variant="secondary" aria-label="Refresh" onClick={() => onRead(c.query, true)}><RotateCw aria-hidden /></Button></EmptyState>}
            {c.readable && !c.loading && rows.length === 0 && c.rowsQuery === c.query && c.gate === "WriteIdle" && <EmptyState title={c.query ? "No contacts found" : "No contacts yet"} />}
            {c.gate === "WriteUnsettled" && <Button variant="secondary" onClick={() => onRead(c.query, true)}>Refresh Contacts</Button>}
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
                      onClick={() => onOpenContact(row.id)}
                    />
                  </li>
                );
              })}
            </ul>
            {c.more && c.limit < 200 && <Button variant="ghost" onClick={onMore}>Load more</Button>}
            {c.more && c.limit >= 200 && <p className="px-4 py-2 text-sm text-muted-foreground">200 shown. Search to find other contacts.</p>}
          </>
        )}
      </div>
      <RestoredProposal card={card} onDismiss={onDecline} />
      <CommsBar
        comms={comms}
        person={person}
        value={chatOpen ? request : open ? request : c.chip ? "" : c.query}
        onText={(text) => (chatOpen || open ? onRequest(text) : onRead(text))}
        canSubmit={chatOpen || open ? request.trim() !== "" : isAskSentence(c.query)}
        onSubmit={() => {
          if (chatOpen) onSubmitRequest();
          else if (open) onSubmitRequest();
          else onAskContacts(c.query);
        }}
        onAlpha={onAlpha}
        onEnd={onEndCall}
        onBack={onCloseChat}
      />
    </section>
  );
}
