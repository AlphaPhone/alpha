import type { ComponentProps, ReactNode } from "react";
import { Check, ChevronLeft, Pause, Play } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";

/** One line of a voice note's transcript: who said it, when, and what. */
export interface VoiceNoteLine {
  /** The speaker's initials, or `You` for the owner. */
  initials: string;
  /** The speaker's first name, or `You`. */
  who: string;
  /** Whether the owner said it. */
  own: boolean;
  /** Where in the recording it was said, as `1:30`. */
  at: string;
  text: string;
}

/** An action item the summary found. */
export interface VoiceNoteAction {
  text: string;
  done: boolean;
}

export type VoiceNoteViewProps = Omit<ComponentProps<"section">, "title"> & {
  title: string;
  /** When it was recorded and how long it runs. */
  meta: string;
  /** Where playback is and how long the recording runs, as `0:00 / 6:48`. */
  time?: string;
  /** Whether the recording is playing. */
  playing?: boolean;
  /** The summary's points. */
  summary?: string[];
  /** The action items, each ticked or not. */
  actions?: VoiceNoteAction[];
  /** The transcript, line by line. */
  lines?: VoiceNoteLine[];
  /** The note's actions: a `NoteMenu`. */
  menu?: ReactNode;
  /** A status or confirmation concerning this note. */
  feedback?: ReactNode;
  /** Plays the recording, or pauses it; offered only with it. */
  onPlay?: () => void;
  /** Ticks or unticks an action item; offered only with it. */
  onAction?: (index: number) => void;
  /** Plays from a line; offered only with it. */
  onSeek?: (index: number) => void;
  /** Opens the composer for a question about the saved transcript. */
  onAskTranscript?: () => void;
  /** Leaves the note for the list. */
  onBack?: () => void;
};

const card = "mt-5.5 flex flex-col gap-3 rounded-panel bg-secondary p-4.5";

/** An open voice note: its title and length, playback, the summary and action items, and the transcript. */
export function VoiceNoteView({ title, meta, time = "", playing = false, summary = [], actions = [], lines = [], menu, feedback, onPlay, onAction, onSeek, onAskTranscript, onBack, className, ...props }: VoiceNoteViewProps) {
  return (
    <section aria-label={title} className={cn("absolute inset-0 z-10 flex flex-col bg-background", className)} {...props}>
      <div className="flex h-14 shrink-0 items-center gap-0.5 px-2">
        <button type="button" aria-label="Back to notes" onClick={onBack} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full active:bg-accent")}><ChevronLeft aria-hidden className="size-5.5" /></button>
        <div className="grow" />
        {menu}
      </div>
      <div className="mx-auto min-h-0 w-full max-w-3xl grow touch-pan-y overflow-y-auto px-6 pt-1 pb-37.5">
        <h1 className="py-1 font-display text-headline font-light">{title}</h1>
        <div className="mt-0.5 text-sm leading-normal text-muted-foreground">{meta}</div>
        <div className="mt-5.5 flex items-center gap-3.5">
          <button type="button" aria-label={playing ? "Pause" : "Play"} disabled={!onPlay} onClick={onPlay} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
            {playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5 fill-current" />}
          </button>
          <div className="min-w-0 grow">
            <div role="img" aria-label="Recording playback activity" className="h-9 w-full" />
            <div className="mt-1 text-right text-xs text-muted-foreground">{time}</div>
          </div>
        </div>
        {feedback}
        {onAskTranscript && <button type="button" aria-label="Ask Alpha about this transcript" onClick={onAskTranscript}
          className={cn(focusRing, "mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold active:bg-accent")}>
          <Mark aria-hidden className="size-4 text-primary" /> Ask Alpha
        </button>}
        <div className={card}>
          <span className="flex size-5 shrink-0 items-center justify-center text-primary"><Mark aria-hidden className="size-full" /></span>
          {summary.length === 0 && <div className="text-base text-muted-foreground">Too short</div>}
          {summary.map((point) => (
            <div key={point} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-base leading-snug">{point}</span>
            </div>
          ))}
        </div>
        {actions.length > 0 && (
          <div className="mt-2.5 rounded-panel bg-secondary pt-2 pr-2 pb-2.5 pl-1.5">
            {actions.map((action, index) => (
              <div key={action.text} className="flex items-start gap-1">
                <button type="button" aria-label={`${action.done ? "Uncheck" : "Check"} ${action.text}`} disabled={!onAction} onClick={() => onAction?.(index)} className={cn(focusRing, "flex size-12 shrink-0 items-center justify-center rounded-full")}>
                  <span className={cn("flex size-5.5 items-center justify-center rounded-box", action.done ? "bg-foreground text-background" : "text-transparent inset-ring-[1.5px] inset-ring-muted-foreground")}><Check aria-hidden className="size-3.75" /></span>
                </button>
                <span className={cn("py-2.75 pr-2 text-base", action.done && "text-muted-foreground line-through")}>{action.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6.5 flex flex-col gap-1">
          {lines.map((line, index) => (
            <div key={`${line.at} ${line.text}`} className="flex items-start gap-2 py-2.5">
              <button type="button" aria-label={`Play from ${line.at}`} disabled={!onSeek} onClick={() => onSeek?.(index)} className={cn(focusRing, "flex min-h-12 w-12 flex-none items-center justify-center rounded-lg")}>
                <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-full text-2xs font-bold whitespace-nowrap", line.own ? "bg-primary text-primary-foreground" : "bg-accent text-foreground")}>{line.initials}</span>
              </button>
              <div className="min-w-0 grow">
                <div className="text-xs text-muted-foreground">{line.who} · {line.at}</div>
                <p className="mt-0.5 text-body leading-normal break-words whitespace-pre-wrap select-text">{line.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
