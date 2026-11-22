// spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/search.md, "A search answer shows only while search is open and its owner scope is the one that asked"
import { Effect } from "effect";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { initial as searchStart, canLoadMore } from "../../../gen/assistant__search.ts";
import { useMachine as useSearch } from "../../../gen/assistant__search.react.ts";
import { ChatSearch } from "../../assistant/search.vibe";
import { Button, EmptyState, Input, ListRow, ScrollArea } from "../components/ui/index.ts";
import { hitsStream, run, runtime } from "./runtime.ts";
import { useServiceStream } from "./use-stream.ts";

export type ChatSearchPanelProps = {
  /** Leave search and return to the conversation. */
  onClose: () => void;
};

/**
 * Search across my chats; a hit opens its conversation around the message.
 * @model spec/assistant/search.md
 */
export function ChatSearchPanel({ onClose }: ChatSearchPanelProps) {
  const [query, setQuery] = useState("");
  const { state = searchStart } = useSearch(runtime);
  const hits = useServiceStream(runtime, "assistant/hits", hitsStream, []);
  const search = (use: (s: ChatSearch.Shape) => Effect.Effect<unknown>) => run(Effect.flatMap(Effect.service(ChatSearch), use));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label="Back to chat" onClick={() => { search((s) => s.close()); onClose(); }}><ArrowLeft className="size-5" /></Button>
        <Input aria-label="Search chats" placeholder="Search chats" value={query} autoFocus
          onChange={(event) => { setQuery(event.target.value); search((s) => s.query(event.target.value)); }} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {state.results && hits.length === 0 && <EmptyState title="No matches" />}
        <ul>
          {hits.map((hit) => (
            <li key={hit.id}>
              <ListRow title={hit.snippet ?? hit.text} detail={hit.createdAt ? new Date(hit.createdAt).toLocaleDateString() : undefined}
                onClick={() => search((s) => Effect.map(s.openHit(hit), (opened) => { if (opened) onClose(); }))} />
            </li>
          ))}
        </ul>
        {canLoadMore(state) && <Button variant="ghost" onClick={() => search((s) => s.more())}>More</Button>}
      </ScrollArea>
    </div>
  );
}
