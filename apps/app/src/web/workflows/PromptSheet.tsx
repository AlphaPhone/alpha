// spec/workflows/agentSchedules.md, "A prompt needs a name and instructions, and its trigger's own data"; spec/workflows/agentSchedules.md, "A new prompt is saved paused, and a save is confirmed only by the prompt as it was sent"
import { useState } from "react";
import { draftProblem } from "../../../gen/workflows__agentSchedules.ts";
import type { PromptInput, Report } from "../../workflows/automations.vibe";
import { Button, Input, Label, RadioGroup, RadioGroupItem, Sheet, SheetContent, Textarea } from "../components/ui/index.ts";
import { reportWords } from "./words.ts";

export interface PromptSheetProps {
  open: boolean;
  /** The prompt being changed, or undefined for a new one. */
  editing?: PromptInput;
  /** What the last save reported. */
  report?: Report;
  /** Whether a save may be held now. */
  canSave: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: PromptInput) => void;
}

function localInput(at: number): string {
  if (!at) return "";
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * A prompt the agent sends once, on a schedule or on an event; a new one is saved paused.
 * @model spec/workflows/automations.md
 * @design design.md
 */
export function PromptSheet({ open, editing, report, canSave, onOpenChange, onSave }: PromptSheetProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [instructions, setInstructions] = useState(editing?.instructions ?? "");
  const [kind, setKind] = useState<PromptInput["kind"]>(editing?.kind ?? "once");
  const [at, setAt] = useState(localInput(editing?.at ?? 0));
  const [cron, setCron] = useState(editing?.cron ?? "");
  const [eventKind, setEventKind] = useState(editing?.eventKind ?? "");
  const instant = at === "" ? 0 : new Date(at).getTime();
  const input: PromptInput = { title, instructions, kind, at: instant, cron, eventKind, ...(editing?.original === undefined ? {} : { original: editing.original }) };
  const ready = draftProblem({ title: title.trim(), instructions: instructions.trim(), kind: kind === "once" ? "OnceAt" : kind === "cron" ? "OnCron" : "OnEvent",
    at: instant, cron: cron.trim(), eventKind: eventKind.trim(), unchangedTime: editing?.original?.at === instant, wasEnabled: editing?.original?.enabled ?? false }, Date.now()) === "DraftReady";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" title={editing === undefined ? "New prompt" : "Change prompt"}>
        <form className="flex flex-col gap-3 px-5 pb-5" onSubmit={(e) => { e.preventDefault(); if (ready && canSave) onSave(input); }}>
          <Label htmlFor="prompt-title">Name</Label>
          <Input id="prompt-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          <Label htmlFor="prompt-instructions">Instructions</Label>
          <Textarea id="prompt-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <RadioGroup aria-label="When" value={kind} onValueChange={(v) => setKind(v as PromptInput["kind"])} className="flex gap-4">
            {(["once", "cron", "event"] as const).map((k) => (
              <Label key={k} className="flex items-center gap-2"><RadioGroupItem value={k} />{k === "once" ? "Once" : k === "cron" ? "Repeats" : "On an event"}</Label>
            ))}
          </RadioGroup>
          {kind === "once" && <Input aria-label="Time" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />}
          {kind === "cron" && <Input aria-label="Schedule" value={cron} placeholder="0 9 * * 1-5" onChange={(e) => setCron(e.target.value)} />}
          {kind === "event" && <Input aria-label="Event name" value={eventKind} onChange={(e) => setEventKind(e.target.value)} />}
          {editing === undefined && <p className="text-sm text-muted-foreground">Saved paused. Turn it on when you are ready.</p>}
          {report?.word !== undefined && <p role="status" className="text-sm">{reportWords[report.word]}</p>}
          <Button type="submit" size="lg" disabled={!ready || !canSave}>Save</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
