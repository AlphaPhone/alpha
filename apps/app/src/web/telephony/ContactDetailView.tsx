// spec/telephony/contacts.md, "An open contact shows the fields the phone holds now, read for its own ticket"; spec/telephony/contacts.md, "A removal needs the owner's confirmation of the contact read whole, at its version"
import { Mail, MessageSquare, Pencil, Phone as PhoneIcon, Trash2 } from "lucide-react";
import { visibleRows, type Contacts } from "../../../gen/telephony__contacts.ts";
import { Avatar, Button } from "../components/ui/index.ts";
import { displayNumber, typeLabel } from "./present.ts";

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
