import type { ComponentProps, ReactNode } from "react";
import { Link } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { NoteFrame } from "./NoteFrame.tsx";

export type LinkNoteViewProps = Omit<ComponentProps<"section">, "title"> & {
  title: string;
  /** The site the page is on. */
  domain: string;
  /** The passages kept from the page. */
  clips?: string[];
  /** The note's actions: a `NoteMenu`. */
  menu?: ReactNode;
  /** A status or confirmation concerning this note. */
  feedback?: ReactNode;
  /** Opens the page; offered only with it. */
  onVisit?: () => void;
  /** Leaves the note for the list. */
  onBack?: () => void;
};

/** An open link note: the page's title, its site to visit, and the passages kept from it. */
export function LinkNoteView({ title, domain, clips = [], menu, feedback, onVisit, onBack, className, ...props }: LinkNoteViewProps) {
  return (
    <NoteFrame title={title} menu={menu} onBack={onBack} className={className} {...props}>
      <div className="min-h-0 grow touch-pan-y overflow-y-auto px-6 pt-1 pb-37.5">
        <h1 className="m-0 font-display text-headline font-light">{title}</h1>
        <button type="button" aria-label={`Open ${domain}`} disabled={!onVisit} onClick={onVisit} className={cn(focusRing, "mt-3.5 inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-4 text-sm text-primary")}>
          <Link aria-hidden className="size-4" />
          {domain}
        </button>
        {feedback}
        <div className="mt-7 flex flex-col gap-5">
          {clips.map((clip) => (
            <div key={clip} className="flex gap-3.5">
              <span className="w-0.75 shrink-0 rounded-full bg-primary" />
              <div className="font-display text-quote font-light">{clip}</div>
            </div>
          ))}
        </div>
      </div>
    </NoteFrame>
  );
}
