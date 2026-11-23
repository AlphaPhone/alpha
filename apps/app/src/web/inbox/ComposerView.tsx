// spec/inbox/drafts.md, "Story: Keep what I write, with the account I wrote it from"; spec/inbox/drafts.md, "Story: Type without waiting for storage"; spec/inbox/attachments.md, "Story: Attach files to an email I write"; spec/inbox/drafts.md, "Story: Send from another of my accounts"
import { ChevronLeft, Paperclip, Send, X } from "lucide-react";
import { useState } from "react";
import type { Draft, DraftFields } from "../../../gen/inbox__drafts.ts";
import { movable } from "../../../gen/inbox__drafts.ts";
import type { MailAccount } from "../../../gen/inbox__accounts.ts";
import { literalMailAddress } from "../../inbox/text.ts";
import { suggestRecipients } from "../../inbox/composer.vibe";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "../components/ui/index.ts";

/** What the composer shows of the open draft and its account, and what each edit, attachment and send asks for. */
export type ComposerViewProps = {
  /** The open draft. */
  draft: Draft;
  /** The account it is written from, and the others a new email may move to. */
  account: MailAccount;
  accounts: MailAccount[];
  /** Whether the account may send and save Gmail drafts now. */
  canSend: boolean;
  canSaveToGmail: boolean;
  /** Whether a send or save is running. */
  busy: boolean;
  /** One edit as typed; the shell writes edits coalesced. */
  onEdit: (fields: DraftFields, pendingTo: string) => void;
  /** Opens Files' picker; chosen files are checked and attached. */
  onAttach: () => void;
  onBack: () => void;
  onSend: () => void;
  onSaveToGmail: () => void;
  onMove: (grant: string) => void;
  /** Recent addresses of the account that To may suggest. */
  candidates: string[];
};

const heading = { ComposeMode: "New email", ReplyMode: "Reply", ReplyAllMode: "Reply all", ForwardMode: "Forward" } as const;

/** Splits a typed list of addresses on commas and spaces. */
function split(text: string): string[] {
  return text.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
}

/**
 * The composer of the open draft: recipients as chips, subject, body and attachments, with Send as the one manual step.
 * @model spec/inbox/drafts.md
 */
export function ComposerView({ draft, account, accounts, canSend, canSaveToGmail, busy, onEdit, onAttach, onBack, onSend, onSaveToGmail, onMove, candidates }: ComposerViewProps) {
  const [fields, setFields] = useState<DraftFields>(draft.fields);
  const [pendingTo, setPendingTo] = useState(draft.pendingTo);
  const [ccText, setCcText] = useState(draft.fields.ccList.join(", "));
  const [bccText, setBccText] = useState(draft.fields.bccList.join(", "));
  const fixedSubject = fields.mode === "ReplyMode" || fields.mode === "ReplyAllMode";

  const change = (next: DraftFields, typed = pendingTo) => {
    setFields(next);
    setPendingTo(typed);
    onEdit(next, typed);
  };
  const addTyped = (typed: string) => {
    const address = typed.trim();
    if (!literalMailAddress(address) || fields.toList.length >= 20) return false;
    change({ ...fields, toList: fields.toList.includes(address) ? fields.toList : [...fields.toList, address] }, "");
    return true;
  };
  const others = accounts.filter((a) => a.id !== account.id && a.connected);

  return (
    <form aria-label={heading[fields.mode]} className="flex flex-col gap-3 px-4 pb-6" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <header className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label="Back" disabled={busy} onClick={onBack}><ChevronLeft aria-hidden /></Button>
        <h2 className="font-display text-2xl">{heading[fields.mode]}</h2>
        <Button type="submit" className="ml-auto" disabled={!canSend || busy || fields.toList.length + fields.ccList.length + fields.bccList.length === 0} loading={busy}>
          <Send aria-hidden />Send
        </Button>
      </header>
      {draft.earlier && <p role="status" className="text-sm text-warn">Earlier version of a sent email. Sending it creates another message.</p>}
      {movable(draft) && others.length > 0 ? (
        <Select value={account.id} onValueChange={onMove}>
          <SelectTrigger aria-label="From"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[account, ...others].map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <p className="font-mono text-xs uppercase text-muted-foreground">From {account.label}</p>
      )}
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-input px-2 py-1">
        {fields.toList.map((address) => (
          <span key={address} className="flex items-center gap-1 rounded-sm bg-secondary px-2 text-sm">
            {address}
            <button type="button" aria-label={`Remove ${address}`} onClick={() => change({ ...fields, toList: fields.toList.filter((a) => a !== address) })}><X aria-hidden className="size-3" /></button>
          </span>
        ))}
        <input
          aria-label="To" placeholder="Email address" className="min-w-32 flex-1 bg-transparent py-1 outline-none" value={pendingTo}
          onChange={(event) => {
            const typed = event.currentTarget.value;
            if (typed.endsWith(" ") && addTyped(typed)) return;
            change(fields, typed);
          }}
          onKeyDown={(event) => { if (event.key === "Enter" && pendingTo.trim() !== "") { event.preventDefault(); addTyped(pendingTo); } }}
          onBlur={() => { if (pendingTo.trim() !== "") addTyped(pendingTo); }}
        />
      </div>
      {suggestRecipients(candidates, pendingTo, [...fields.toList, ...fields.ccList, ...fields.bccList], account.address).length > 0 && (
        <ul aria-label="Suggested recipients" className="flex flex-wrap gap-1">
          {suggestRecipients(candidates, pendingTo, [...fields.toList, ...fields.ccList, ...fields.bccList], account.address).map((address) => (
            <li key={address}><Button size="sm" variant="secondary" onClick={() => addTyped(address)}>{address}</Button></li>
          ))}
        </ul>
      )}
      <Input aria-label="Cc" placeholder="Cc" value={ccText} onChange={(event) => { setCcText(event.currentTarget.value); change({ ...fields, ccList: split(event.currentTarget.value).slice(0, 20) }); }} invalid={!fields.ccList.every(literalMailAddress)} />
      <Input aria-label="Bcc" placeholder="Bcc" value={bccText} onChange={(event) => { setBccText(event.currentTarget.value); change({ ...fields, bccList: split(event.currentTarget.value).slice(0, 20) }); }} invalid={!fields.bccList.every(literalMailAddress)} />
      <Input aria-label="Subject" placeholder="Subject" value={fields.subject} readOnly={fixedSubject} onChange={(event) => change({ ...fields, subject: event.currentTarget.value.replace(/[\r\n]+/g, " ").slice(0, 998) })} />
      <Textarea aria-label="Message" className="min-h-48" value={fields.body} onChange={(event) => change({ ...fields, body: event.currentTarget.value.slice(0, 64000) })} />
      <ul aria-label="Attachments" className="flex flex-col gap-1">
        {fields.files.map((file, index) => (
          <li key={`${file.sha256}-${index}`} className="flex items-center gap-2 text-sm">
            <Paperclip aria-hidden className="size-4" />{file.name} · {file.bytes} bytes
            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => change({ ...fields, files: fields.files.filter((_, at) => at !== index) })}><X aria-hidden className="size-3" /></button>
          </li>
        ))}
        {fields.forward.parts.map((part) => (
          <li key={part.partId} className="flex items-center gap-2 text-sm">
            <Paperclip aria-hidden className="size-4" />{part.name} (original)
            <button type="button" aria-label={`Remove ${part.name}`} onClick={() => change({ ...fields, forward: { ...fields.forward, parts: fields.forward.parts.filter((p) => p.partId !== part.partId) } })}><X aria-hidden className="size-3" /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onAttach}><Paperclip aria-hidden />Attach file</Button>
        {canSaveToGmail && <Button variant="ghost" size="sm" className="ml-auto" disabled={busy} onClick={onSaveToGmail}>{draft.provider.draftId ? "Replace Gmail draft" : "Save to Gmail"}</Button>}
      </div>
    </form>
  );
}
