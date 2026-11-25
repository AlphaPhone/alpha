import type { ComponentProps } from "react";
import { SearchX } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { cn, focusRing } from "../../lib/cn.ts";
import { Input } from "../Input.tsx";
import { Skeleton } from "../Skeleton.tsx";

export type AssistantSearchHit = {
  /** Keeps the hit in place between pages. */
  id: string;
  /** The conversation it was said in. */
  chat: string;
  /** The words around the match. */
  snippet: string;
  /** When it was said. */
  when?: string;
  /** It is in the conversation showing, so it opens whatever else is going on. */
  here?: boolean;
};

export type AssistantSearchProps = Omit<ComponentProps<"div">, "children"> & {
  /** The words searched for; the screen keeps them. */
  words: string;
  /** The hits shown, a page after a page, for the newest asking only. */
  hits: AssistantSearchHit[];
  /** The page is being read, was read, or could not be; a failed page keeps the hits already shown. */
  status?: "idle" | "loading" | "loaded" | "failed";
  /** A turn is in flight or the composer holds something: a hit in another conversation waits until it is sent or removed. */
  blocked?: boolean;
  /** Called with the words as they are typed. */
  onWordsChange: (words: string) => void;
  /** Shows the next page of hits; offered only after a full page. */
  onMore?: () => void;
  /** Opens a hit in its conversation around its message. */
  onOpenHit?: (id: string) => void;
};

/**
 * Searching every conversation: the words, a page of hits at a time, and each hit opened where it was said. Its states
 * are idle, loading, nothing found, failed, and hits waiting on a turn or a draft.
 * @model spec/app/assistant/search.md
 */
export function AssistantSearch({ words, hits, status = "idle", blocked = false, onWordsChange, onMore, onOpenHit, ...props }: AssistantSearchProps) {
  return (
    <div className="flex flex-col gap-4" {...props}>
      <Input type="search" aria-label="Search chats" placeholder="Search messages" value={words} onChange={(event) => onWordsChange(event.target.value)} className="rounded-action border-0 px-4 [&::-webkit-search-cancel-button]:hidden" />
      {blocked && hits.some((hit) => !hit.here) ? <Banner variant="info">Send or remove what you are writing to open another chat</Banner> : null}
      {hits.length ? (
        <section aria-label="Results">
          <div className="flex flex-col">
            {hits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                disabled={blocked && !hit.here}
                onClick={onOpenHit ? () => onOpenHit(hit.id) : undefined}
                className={cn(focusRing, "flex flex-col-reverse gap-1.5 border-b border-border py-4 text-left disabled:opacity-50")}
              >
                <span className="text-base break-words">{hit.snippet}</span>
                <span className="text-sm text-muted-foreground">{hit.when ?? hit.chat}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {status === "loading" ? <div aria-busy className="flex flex-col gap-2"><Skeleton className="h-13" /><Skeleton className="h-13" /></div> : null}
      {status === "failed" ? <Banner variant="warn">Search did not finish</Banner> : null}
      {status === "loaded" && !hits.length ? <EmptyState icon={<SearchX />} title="Nothing found" /> : null}
      {status === "loaded" && onMore ? <Button variant="ghost" className="w-full" onClick={onMore}>More results</Button> : null}
    </div>
  );
}
