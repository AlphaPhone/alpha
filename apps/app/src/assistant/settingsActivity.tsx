// spec/app/settings/activity.md, "Story: Help the agent recover"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"; spec/app/assistant/chats.md, "Story: Find my conversations"
import { ListGroup, ListRow, SettingsNavRow } from "@repo/ui";
import { Effect } from "effect";
import { Clock, Plus, Undo2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Area } from "../runtime/area.tsx";
import { type AssistantProps } from "./Assistant.tsx";
import { freedom } from "./assistant.vibe";
import assistant from "./index.tsx";
import { Talk } from "./talk.vibe";

function ConversationActions({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime).state;
  const chats = useChats(runtime);
  const composer = useComposer(runtime).state;
  const shell = useShell(runtime);
  const board = useMemo(() => runtime.runSync(Effect.map(Talk, (talk) => talk.board)), [runtime]);
  const store = useMemo(() => ({ subscribe: (listener: () => void) => board.subscribe(listener), snapshot: () => board.snapshot() }), [board]);
  const seen = useSyncExternalStore(store.subscribe, store.snapshot);
  const [listing, setListing] = useState(false);
  if (!conversation || !chats.state || !composer) return null;
  const shown = chats.state;
  const free = freedom(conversation, composer, shown.chosen);
  const start = { type: "start", ...free } as const;
  const browse = { type: "browse" } as const;
  const open = { type: "raise", detent: "Full" } as const;
  const select = (event: typeof start | { type: "choose"; conversation: number; replying: boolean; holding: boolean }) => {
    void chats.send(event).then((result) => {
      if (result._tag === "Success" && shell.can(open)) void shell.send(open);
    });
  };
  return (
    <ListGroup>
      <ListRow title="New" aria-label="New conversation" leading={<Plus />} disabled={!chats.can(start)} onClick={() => select(start)} />
      <SettingsNavRow title="History" aria-label="Load conversations" icon={<Clock />} disabled={shown.list.status === "Loading" || !chats.can(browse)} onOpen={() => {
        setListing(true);
        void chats.send(browse);
      }} />
      {listing && shown.list.status === "Failed" && <ListRow title="History could not be loaded" />}
      {listing && shown.list.status === "Loaded" && shown.ids.length === 0 && <ListRow title="No saved conversations" />}
      {listing && shown.list.status === "Loaded" && shown.ids.map((id) => {
        const title = seen.titles.get(id) ?? "Ask Alpha";
        const choose = { type: "choose", conversation: id, ...free } as const;
        const current = id === shown.chosen;
        return <ListRow key={id} title={title} leading={<Undo2 />} aria-label={`Restore conversation: ${title}`} disabled={current ? !shell.can(open) : !chats.can(choose)} onClick={() => {
          if (current) void shell.send(open);
          else select(choose);
        }} />;
      })}
    </ListGroup>
  );
}

/** The owner starts or restores an Ask Alpha conversation from the Agent activity page. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    return function ActivityConversations() {
      return <ConversationActions runtime={runtime} />;
    };
  },
} satisfies Area;
