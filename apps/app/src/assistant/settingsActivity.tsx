// spec/app/settings/activity.md, "Story: Help the agent recover"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"; spec/app/assistant/chats.md, "Story: Find my conversations"
import { ListGroup, ListRow, SettingsNavRow } from "@repo/ui";
import { Effect } from "effect";
import { Clock, Plus, RotateCw, Undo2 } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import { making } from "../../gen/app__assistant__chats.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { Machine as ShellMachine, canRaise } from "../../gen/app__shell.effect.vibe";
import type { Area } from "../runtime/ui.tsx";
import { type AssistantProps } from "./Assistant.tsx";
import { freedom } from "./assistant.vibe";
import assistant from "./index.tsx";
import { Talk } from "./talk.vibe";

/**
 * Where Alpha's earlier build kept the conversations: on Agent activity, New starts one and History lists the saved
 * ones, each restored into Ask Alpha with one press. As there, they are not offered while Alpha is answering.
 */
function ConversationActions({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime).state;
  const chats = useChats(runtime);
  const composer = useComposer(runtime).state;
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
    void runtime.runPromiseExit(Effect.gen(function* () {
      const shell = yield* ShellMachine;
      if (canRaise(yield* shell.get(), "Full")) yield* shell.send({ type: "raise", detent: "Full" });
    }));
  };
  const listed = listing && shown.list.status !== "Idle";
  if (free.replying && !(listed && shown.list.status === "Failed")) return null;
  return (
    <ListGroup aria-label="Chat history">
      {free.replying ? null : <>
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
          <ListRow key={id} title={title} aria-label={`Restore conversation: ${title}`} selected={id === shown.chosen} leading={<Undo2 />} disabled={id !== shown.chosen && !chats.can(choose)} onClick={id === shown.chosen ? raise : () => {
            void chats.send(choose).then((result) => { if (result._tag === "Success") raise(); });
          }} />
        );
      }) : null}
      </>}
      {listed && shown.list.status === "Failed" ? (
        <>
          <ListRow title="History" detail="Chats did not load" />
          {free.replying ? null : <ListRow title="Retry" aria-label="Retry saved conversation" leading={<RotateCw />} onClick={() => void chats.send({ type: "browse" })} />}
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
