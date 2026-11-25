// spec/telephony/contacts.md, "The in-app editor opens only with write access and no write unsettled; otherwise the system editor opens"; spec/telephony/contacts.md, "A save names the version shown, a changed contact keeps the editor and writes nothing"
import type { ContactDraft } from "@elizaos/os-bridges";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { Detail, Editor } from "../../../gen/telephony__contacts.ts";
import { Button, Input, Label, Textarea } from "../components/ui/index.ts";
import { typeLabel } from "./present.ts";

export interface ContactEditorProps {
  /** The editor as the spec holds it: creating or editing, dirty, stale, notes editable. */
  editor: Extract<Editor, { tag: "EditorOpen" }>;
  /** The contact read whole that an edit starts from. */
  detail: Detail;
  /** A save is running. */
  saving: boolean;
  /** The owner changed a field. */
  onEdited: () => void;
  /** Save the draft. */
  onSave: (draft: ContactDraft) => void;
  /** Close without saving. */
  onCancel: () => void;
}

type Row = { value: string; type: string };

/**
 * The in-app editor: first and last name, phones, emails and notes; notes the phone cannot edit as one value are left alone.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactEditor({ editor, detail, saving, onEdited, onSave, onCancel }: ContactEditorProps) {
  const read = editor.mode === "Editing" && detail.tag === "DetailRead" ? detail : undefined;
  const structured = !!(read?.givenName || read?.familyName);
  const [given, setGiven] = useState(read ? (structured ? read.givenName : read.displayName) : "");
  const [family, setFamily] = useState(read?.familyName ?? "");
  const [notes, setNotes] = useState(read?.notes ?? "");
  const [phones, setPhones] = useState<Row[]>(read?.phoneFields.length ? read.phoneFields.map((p) => ({ value: p.number, type: p.phoneType })) : [{ value: "", type: "mobile" }]);
  const [emails, setEmails] = useState<Row[]>(read?.emailFields.length ? read.emailFields.map((e) => ({ value: e.address, type: e.emailType })) : [{ value: "", type: "home" }]);
  const [nameEdited, setNameEdited] = useState(false);
  const [notesEdited, setNotesEdited] = useState(false);
  const touch = <T,>(set: (value: T) => void) => (value: T) => { set(value); onEdited(); };
  const draft = (): ContactDraft => {
    const phoneNumbers = phones.filter((p) => p.value.trim()).map((p) => ({ number: p.value, type: p.type as ContactDraft["phoneNumbers"][number]["type"] }));
    const emailAddresses = emails.filter((e) => e.value.trim()).map((e) => ({ address: e.value, type: e.type as ContactDraft["emailAddresses"][number]["type"] }));
    const named = nameEdited || editor.mode === "Creating";
    const displayName = named ? [given, family].filter((v) => v.trim()).join(" ").trim() || phoneNumbers[0]?.number || emailAddresses[0]?.address || "" : read?.displayName ?? "";
    return {
      displayName,
      ...(named ? { givenName: given, familyName: family } : {}),
      ...(editor.notesEditable && (notesEdited || (editor.mode === "Creating" && notes)) ? { notes } : {}),
      phoneNumbers,
      emailAddresses,
    };
  };
  const rows = (list: Row[], set: (rows: Row[]) => void, email: boolean) => list.map((row, index) => (
    <div key={index} className="flex items-center gap-2">
      <Input
        aria-label={index === 0 ? (email ? "Email" : "Phone") : `${typeLabel(row.type, email)} ${email ? "email" : "phone"}`}
        value={row.value}
        disabled={saving}
        inputMode={email ? "email" : "tel"}
        onChange={(event) => touch(set)(list.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)))}
      />
      {(row.value || list.length > 1) && (
        <Button variant="ghost" size="icon" aria-label={`Remove ${typeLabel(row.type, email).toLowerCase()} ${email ? "email" : "number"}`} disabled={saving}
          onClick={() => touch(set)(list.length > 1 ? list.filter((_, i) => i !== index) : [{ value: "", type: email ? "home" : "mobile" }])}>
          <X aria-hidden />
        </Button>
      )}
    </div>
  ));
  return (
    <form className="flex flex-col gap-3 px-4 py-2" onSubmit={(event) => { event.preventDefault(); onSave(draft()); }}>
      <Label htmlFor="contact-given">First name</Label>
      <Input id="contact-given" value={given} maxLength={256} disabled={saving} onChange={(event) => { setNameEdited(true); touch(setGiven)(event.target.value); }} />
      <Label htmlFor="contact-family">Last name</Label>
      <Input id="contact-family" value={family} maxLength={256} disabled={saving} onChange={(event) => { setNameEdited(true); touch(setFamily)(event.target.value); }} />
      {rows(phones, setPhones, false)}
      <Button variant="ghost" size="sm" disabled={saving || phones.length >= 32} onClick={() => touch(setPhones)([...phones, { value: "", type: "mobile" }])}><Plus aria-hidden />Phone</Button>
      {rows(emails, setEmails, true)}
      <Button variant="ghost" size="sm" disabled={saving || emails.length >= 32} onClick={() => touch(setEmails)([...emails, { value: "", type: "home" }])}><Plus aria-hidden />Email</Button>
      <Label htmlFor="contact-notes">Notes</Label>
      {editor.notesEditable ? (
        <Textarea id="contact-notes" value={notes} maxLength={8192} disabled={saving} onChange={(event) => { setNotesEdited(true); touch(setNotes)(event.target.value); }} />
      ) : (
        <p id="contact-notes" className="text-sm text-muted-foreground">Notes are edited in Android Contacts.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={saving || !editor.dirty || editor.stale}>Save</Button>
      </div>
    </form>
  );
}
