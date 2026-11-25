import { Info } from "lucide-react";

export type AssistantNoticeCardProps = {
  /** What Alpha is telling the owner. */
  title: string;
  /** More about it, in a line. */
  detail?: string;
};

/** A notice in a reply, quiet beside its info mark. It opens nothing and asks nothing. */
export function AssistantNoticeCard({ title, detail }: AssistantNoticeCardProps) {
  return (
    <div role="note" className="flex w-full items-start gap-3 rounded-tile bg-secondary p-3.5 text-secondary-foreground">
      <Info aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold break-words">{title}</span>
        {detail ? <span className="text-sm leading-details break-words text-muted-foreground">{detail}</span> : null}
      </span>
    </div>
  );
}
