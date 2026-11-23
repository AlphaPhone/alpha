// spec/notes/editor.md, "Story: Edit a note without losing a word"; spec/notes/list.md, "Each checklist row keeps its own place and a name a screen reader can say"; spec/notes/editor.md, "Leaving saves an edited draft first, drops an untouched new note and otherwise just closes"; spec/notes/share.md, "A share acts on the open note's snapshot, only while it is still the same note"; spec/notes/origins.md, "The draft text is the note's open action items, then its open checklist items, then its body"; spec/notes/audio.md, "Playback starts only for the open note's own live recording, and stops before any change to it"
import { ArrowLeft, Calendar, Copy, Ellipsis, ExternalLink, Globe, ListChecks, Mail, Paperclip, Pause, Pin, PinOff, Play, Plus, Share2, Sparkles, Trash2, Type, X } from "lucide-react";
import { useState } from "react";
import type { NoteFormat } from "@elizaos/plugin-notes/types";
import { Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, Textarea } from "../components/ui/index.ts";
import type { DraftContent, DraftPatch } from "../../notes/editor.vibe";
import { type CheckItem, type NoteRow, checklistItems, checklistText } from "../../notes/list.vibe";
import type { ShareChannel } from "../../notes/share.vibe";
import { recordingClock } from "../../notes/recorder.vibe";
import { type ChecklistRows, itemName, rowAdded, rowRemoved } from "../../../gen/notes__list.ts";

export type NoteEditorProps = {
  /** The open draft's words. */
  draft: DraftContent;
  /** The saved note the draft edits, when it is saved. */
  row?: NoteRow;
  /** The one-word save status. */
  status: string;
  /** Whether the saved note can start a Calendar draft, be shared and deleted now. */
  saved: boolean;
  /** Whether this note's recording is playing, and where. */
  playing: boolean;
  positionMs: number;
  /** Whether a transcript is being generated. */
  transcribing: boolean;
  onEdit: (patch: DraftPatch) => void;
  onBack: () => void;
  onDelete: () => void;
  onShare: (channel: ShareChannel) => void;
  onSchedule: (kind: "event" | "reminder") => void;
  onPlay: () => void;
  onStopPlayback: () => void;
  onTranscribe: () => void;
  /** Stop the transcript being generated; the recording is kept. */
  onCancelTranscript?: () => void;
  onWebSource: () => void;
  onAttachment: () => void;
};

function items(format: NoteFormat | undefined): CheckItem[] {
  const value = format?.data.items;
  return Array.isArray(value) ? value.flatMap((item) => item !== null && typeof item === "object" && !Array.isArray(item) && typeof item.t === "string" ? [{ t: item.t, done: item.done === true }] : []) : [];
}

/**
 * One note open for editing: title and body, a checklist's items, or a voice note's recording and transcript, with the note's actions.
 * @model spec/notes/editor.md
 */
export function NoteEditor({ draft, row, status, saved, playing, positionMs, transcribing, onEdit, onBack, onDelete, onShare, onSchedule, onPlay, onStopPlayback, onTranscribe, onCancelTranscript, onWebSource, onAttachment }: NoteEditorProps) {
  const [newItem, setNewItem] = useState("");
  const [rowKeys, setRowKeys] = useState<ChecklistRows>({ keys: [], nextKey: 0 });
  const kind = draft.format?.kind ?? "text";
  const list = items(draft.format);
  let placed = rowKeys.keys.length > list.length ? { ...rowKeys, keys: rowKeys.keys.slice(0, list.length) } : rowKeys;
  while (placed.keys.length < list.length) placed = rowAdded(placed);
  if (placed !== rowKeys) setRowKeys(placed);
  const setItems = (next: CheckItem[]) => onEdit({ format: { kind: "list", data: { ...(draft.format?.data ?? {}), items: next.map((item) => ({ t: item.t, done: item.done })) } } });
  const data = draft.format?.data ?? {};
  const pinned = data.pinned === true;
  // spec/notes/list.md: a pin is part of the note's saved format, and text and a checklist turn into each other keeping every item and its tick.
  const togglePin = () => onEdit({ format: { kind, data: { ...data, pinned: !pinned } } });
  const toChecklist = () => onEdit({ body: "", format: { kind: "list", data: { ...data, items: checklistItems(draft.body) } } });
  const toText = () => {
    const { items: _items, ...rest } = data;
    onEdit({ body: checklistText(list), format: { kind: "text", data: rest } });
  };
  const removeItem = (index: number) => {
    setRowKeys(rowRemoved(placed, index));
    setItems(list.filter((_, at) => at !== index));
  };
  return (
    <section className="flex h-full flex-col" aria-label={draft.title || "Note"}>
      <header className="flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ArrowLeft aria-hidden /></Button>
        <span className="flex-1 font-mono text-xs uppercase text-muted-foreground" role="status">{status}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Note actions"><Ellipsis aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={togglePin}>{pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}{pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
            {kind === "text" && <DropdownMenuItem onSelect={toChecklist}><ListChecks aria-hidden />Turn into checklist</DropdownMenuItem>}
            {kind === "list" && <DropdownMenuItem onSelect={toText}><Type aria-hidden />Turn into text</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!saved} onSelect={() => onShare("system")}><Share2 aria-hidden />Share</DropdownMenuItem>
            <DropdownMenuItem disabled={!saved} onSelect={() => onShare("copy")}><Copy aria-hidden />Copy text</DropdownMenuItem>
            <DropdownMenuItem disabled={!saved} onSelect={() => onShare("email")}><Mail aria-hidden />Email draft</DropdownMenuItem>
            <DropdownMenuItem disabled={!saved} onSelect={() => onShare("save")}><ExternalLink aria-hidden />Save as text</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!saved} onSelect={() => onSchedule("event")}><Calendar aria-hidden />Review event</DropdownMenuItem>
            <DropdownMenuItem disabled={!saved} onSelect={() => onSchedule("reminder")}><Calendar aria-hidden />Review reminder</DropdownMenuItem>
            {row?.webSource && <DropdownMenuItem onSelect={onWebSource}><Globe aria-hidden />Web source</DropdownMenuItem>}
            {row?.documentSource && <DropdownMenuItem onSelect={onAttachment}><Paperclip aria-hidden />Attachment</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}><Trash2 aria-hidden />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-24">
        <Input aria-label="Title" className="border-0 px-0 font-display text-2xl" value={draft.title} onChange={(event) => onEdit({ title: event.target.value })} />
        {kind === "list" ? (
          <ul className="flex flex-col gap-1">
            {list.map((item, index) => (
              <li key={placed.keys[index] ?? `item-${index}`} className="flex items-center gap-2">
                <Checkbox checked={item.done} aria-label={itemName(item.t.trim() === "") === "NamedByPosition" ? `Item ${index + 1}` : item.t} onCheckedChange={(checked) => setItems(list.map((other, at) => at === index ? { ...other, done: checked === true } : other))} />
                <Input aria-label={`Item ${index + 1}`} className="flex-1 border-0 px-0" value={item.t} onChange={(event) => setItems(list.map((other, at) => at === index ? { ...other, t: event.target.value } : other))} />
                <Button variant="ghost" size="icon" aria-label={itemName(item.t.trim() === "") === "NamedByPosition" ? `Remove item ${index + 1}` : `Remove ${item.t}`} onClick={() => removeItem(index)}><X aria-hidden /></Button>
              </li>
            ))}
            <li>
              <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (newItem.trim() === "") return; setItems([...list, { t: newItem, done: false }]); setNewItem(""); }}>
                <Input aria-label="New item" value={newItem} onChange={(event) => setNewItem(event.target.value)} />
                <Button type="submit" variant="ghost" size="icon" aria-label="Add item" disabled={newItem.trim() === ""}><Plus aria-hidden /></Button>
              </form>
            </li>
          </ul>
        ) : (
          <Textarea aria-label="Note text" className="min-h-64 flex-1 border-0 px-0" value={draft.body} onChange={(event) => onEdit({ body: event.target.value })} />
        )}
        {kind === "voice" && row !== undefined && (
          <div className="flex flex-col gap-2">
            {row.audio && (
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="icon" aria-label={playing ? "Pause recording" : "Play recording"} onClick={playing ? onStopPlayback : onPlay}>{playing ? <Pause aria-hidden /> : <Play aria-hidden />}</Button>
                <span className="font-mono text-xs tabular-nums">{recordingClock(playing ? positionMs : 0)} / {recordingClock(row.audio.durationMs)}</span>
              </div>
            )}
            {row.audio && row.lines.length === 0 && <Button variant="outline" loading={transcribing} onClick={onTranscribe}><Sparkles aria-hidden />Generate transcript</Button>}
            {row.audio && transcribing && onCancelTranscript && <Button variant="ghost" onClick={onCancelTranscript}>Cancel transcript</Button>}
            {row.summary.length > 0 && <p className="text-sm">{row.summary.join(" ")}</p>}
            {row.actions.length > 0 && (
              <ul className="flex flex-col gap-1">{row.actions.map((action, index) => <li key={index} className={action.done ? "text-muted-foreground line-through" : undefined}>{action.t}</li>)}</ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
