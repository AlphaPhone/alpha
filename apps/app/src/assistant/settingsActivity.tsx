// spec/app/settings/activity.md, "Story: Help the agent recover"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"; spec/app/assistant/chats.md, "Story: Find my conversations"
import { ListGroup, ListRow, SettingsNavRow } from "@repo/ui";
import { Effect } from "effect";
import { Clock, Plus, RotateCw, Undo2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import { making } from "../../gen/app__assistant__chats.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Area } from "../runtime/area.tsx";
import { type AssistantProps } from "./Assistant.tsx";
import { freedom } from "./assistant.vibe";
import assistant from "./index.tsx";
import { Talk } from "./talk.vibe";

/**
 * Where Alpha's earlier build kept the conversations: on Agent activity, New starts one and History lists the saved
 * ones, each restored into Ask Alpha with one press.
 */
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
  const busy = making(shown);
  const raise = () => {
    const open = { type: "raise", detent: "Full" } as const;
    if (shell.can(open)) void shell.send(open);
  };
  const listed = listing && shown.list.status !== "Idle";
  return (
    <ListGroup>
      <ListRow title="New" aria-label="New conversation" leading={<Plus />} disabled={!chats.can(start)} onClick={() => {
        void chats.send(start).then((result) => { if (result._tag === "Success") raise(); });
      }} />
      <SettingsNavRow title="History" aria-label={shown.list.status === "Loading" ? "Loading conversations" : "Load conversations"} icon={<Clock />} disabled={busy} onOpen={() => {
        setListing(true);
        void chats.send({ type: "browse" });
      }} />
      {listed ? shown.ids.map((id) => {
        const title = seen.titles.get(id) ?? "Ask Alpha";
        const choose = { type: "choose", conversation: id, ...free } as const;
        return (
          <ListRow key={id} title={title} aria-label={`Restore conversation: ${title}`} leading={<Undo2 />} disabled={!chats.can(choose)} onClick={() => {
            void chats.send(choose).then((result) => { if (result._tag === "Success") raise(); });
          }} />
        );
      }) : null}
      {listed && shown.list.status === "Failed" ? (
        <>
          <ListRow title="History" detail="Chats did not load" />
          <ListRow title="Retry" aria-label="Retry saved conversations" leading={<RotateCw />} onClick={() => void chats.send({ type: "browse" })} />
        </>
      ) : null}
    </ListGroup>
  );
}

/** The owner starts a conversation, or restores a saved one, from the Agent activity page. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    return function ActivityConversations() {
      return <ConversationActions runtime={runtime} />;
    };
  },
} satisfies Area;
