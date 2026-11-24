// spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/search.md, "A search answer shows only while search is open and its owner scope is the one that asked"
import { ArrowLeft } from "lucide-react";
import type { SearchHit } from "../../assistant/payloads.schema.vibe";
import { Button, EmptyState, Input, ListRow, ScrollArea } from "../components/ui/index.ts";

/** The query typed, the hits search answered with, and the owner's moves in it. */
export type ChatSearchPanelViewProps = {
  /** The query in the search box. */
  query: string;
  /** The hits of the open owner's search, in the order they came. */
  hits: readonly SearchHit[];
  /** Search answered the open query, so no hits means no matches. */
  results: boolean;
  /** Another page of hits can be loaded. */
  canLoadMore: boolean;
  /** The owner changed the query. */
  onQuery: (query: string) => void;
  /** The owner went back to the conversation. */
  onBack: () => void;
  /** The owner opened a hit's conversation around its message. */
  onOpenHit: (hit: SearchHit) => void;
  /** The owner asked for the next page of hits. */
  onMore: () => void;
};

/**
 * Search across my chats as search holds it; a hit opens its conversation around the message.
 * @model spec/assistant/search.md
 */
export function ChatSearchPanelView({ query, hits, results, canLoadMore, onQuery, onBack, onOpenHit, onMore }: ChatSearchPanelViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label="Back to chat" onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <Input aria-label="Search chats" placeholder="Search chats" value={query} autoFocus
          onChange={(event) => onQuery(event.target.value)} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {results && hits.length === 0 && <EmptyState title="No matches" />}
        <ul>
          {hits.map((hit) => (
            <li key={hit.id}>
              <ListRow title={hit.snippet ?? hit.text} detail={hit.createdAt ? new Date(hit.createdAt).toLocaleDateString() : undefined}
                onClick={() => onOpenHit(hit)} />
            </li>
          ))}
        </ul>
        {canLoadMore && <Button variant="ghost" onClick={onMore}>More</Button>}
      </ScrollArea>
    </div>
  );
}
