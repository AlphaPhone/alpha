// spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/search.md, "A search answer shows only while search is open and its owner scope is the one that asked"
import { Effect } from "effect";
import { useState } from "react";
import { initial as searchStart, canLoadMore } from "../../../gen/assistant__search.ts";
import { useMachine as useSearch } from "../../../gen/assistant__search.react.ts";
import { ChatSearch } from "../../assistant/search.vibe";
import { ChatSearchPanelView } from "./ChatSearchPanelView.tsx";
import { runtime } from "./runtime.ts";
import { hitsStream } from "./services.ts";
import { act, useServiceStream } from "../shell/services.ts";

/** How search returns to the conversation; search closes itself, so this only tells the caller. */
export type ChatSearchPanelProps = {
  /** Search was left for the conversation. */
  onClose?: () => void;
};

/**
 * Search across my chats over the runtime; a hit opens its conversation around the message.
 * @model spec/assistant/search.md
 */
export function ChatSearchPanel({ onClose }: ChatSearchPanelProps) {
  const [query, setQuery] = useState("");
  const { state = searchStart } = useSearch(runtime);
  const hits = useServiceStream("assistant/hits", hitsStream, []);
  const search = (use: (s: ChatSearch.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(ChatSearch), use));
  return (
    <ChatSearchPanelView
      query={query} hits={hits} results={state.results} canLoadMore={canLoadMore(state)}
      onQuery={(value) => { setQuery(value); search((s) => s.query(value)); }}
      onBack={() => { search((s) => s.close()); onClose?.(); }}
      onOpenHit={(hit) => search((s) => Effect.flatMap(s.openHit(hit), (opened) => opened ? Effect.map(s.close(), () => onClose?.()) : Effect.void))}
      onMore={() => search((s) => s.more())}
    />
  );
}
