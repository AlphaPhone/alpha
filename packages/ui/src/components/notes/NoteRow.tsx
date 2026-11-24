import type { ComponentProps } from "react";
import { AudioLines } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type NoteRowProps = Omit<ComponentProps<"button">, "title"> & {
  /** The note's title, cut to one line. */
  title: string;
  /** When the note last changed, in the owner's words, before the preview. */
  date: string;
  /** The first words of the note, cut to two lines. */
  preview: string;
  /** Marks a voice note with its waveform. */
  voice?: boolean;
};

/** One note in the Notes list: its title, then its date and the first two lines of what it holds. */
export function NoteRow({ title, date, preview, voice = false, className, ...props }: NoteRowProps) {
  return (
    <button
      type="button"
      className={cn(focusRing, "flex w-full items-start gap-3 border-b border-border px-2 py-3 text-left text-foreground focus-visible:-outline-offset-focus active:bg-accent", className)}
      {...props}
    >
      {voice && <AudioLines aria-hidden className="mt-0.5 size-4.5 shrink-0 text-primary" />}
      <span className="block min-w-0 flex-auto">
        <span className="block truncate text-body leading-row font-semibold">{title}</span>
        <span className="mt-0.5 line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">
          <span className="text-foreground">{date}</span>
          {`  ${preview}`}
        </span>
      </span>
    </button>
  );
}
