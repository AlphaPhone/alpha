// spec/app/settings/activity.md, "Story: Help the agent recover"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"; spec/app/assistant/chats.md, "Story: Find my conversations"
import { ListGroup, ListRow, SettingsNavRow } from "@repo/ui";
import { Effect } from "effect";
import { Clock, Plus, RotateCw, Undo2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Area } from "../runtime/area.tsx";
import { type AssistantProps } from "./Assistant.tsx";
import { freedom } from "./assistant.vibe";
import assistant from "./index.tsx";
import { Talk } from "./talk.vibe";

/**
 * New chat and Chat history where Alpha kept them before VibeStack (v121 `settings-adapter.ts`, Agent activity):
 * New conversation, History to read the agent's list, and one row per conversation to open it in Ask Alpha.
 */
function ConversationActions({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime).state;
  const chats = useChats(runtime);
  const composer = useComposer(runtime).state;
  const shell = useShell(runtime);
  const board = useMemo(() => runtime.runSync(Effect.map(Talk, (talk) => talk.board)), [runtime]);
  const seen = useSyncExternalStore((listener) => board.subscribe(listener), () => board.snapshot());
  if (!conversation || !chats.state || !composer) return null;
  const free = freedom(conversation, composer, chats.state.chosen);
  const start = { type: "start", ...free } as const;
  const browse = { type: "browse" } as const;
  const openAskAlpha = () => {
    const open = { type: "raise", detent: "Full" } as const;
    if (shell.can(open)) void shell.send(open);
  };
  const list = chats.state.list.status;
  const chosen = chats.state.chosen;
  const listed = list === "Loaded" ? chats.state.ids : [];
  if (!chats.can(start) && !chats.can(browse) && listed.length === 0) return null;
  return (
    <ListGroup aria-label="Chat history">
      {chats.can(start) ? <ListRow title="New" aria-label="New conversation" leading={<Plus />} onClick={() => {
        void chats.send(start).then((result) => { if (result._tag === "Success") openAskAlpha(); });
      }} /> : null}
      {chats.can(browse) ? <SettingsNavRow title="History" aria-label="Load conversations" icon={<Clock />} onOpen={() => void chats.send(browse)} /> : null}
      {listed.map((id) => {
        const choose = { type: "choose", conversation: id, ...free } as const;
        const title = seen.titles.get(id) ?? "Ask Alpha";
        return <ListRow key={id} title={title} aria-label={`Restore conversation: ${title}`} selected={id === chosen} leading={<Undo2 />} onClick={id === chosen ? openAskAlpha : chats.can(choose) ? () => {
          void chats.send(choose).then((result) => { if (result._tag === "Success") openAskAlpha(); });
        } : undefined} />;
      })}
      {list === "Failed" ? <ListRow title="History" trailing="Chats did not load" /> : null}
      {list === "Failed" && chats.can(browse) ? <ListRow title="Retry" aria-label="Retry saved conversation" leading={<RotateCw />} onClick={() => void chats.send(browse)} /> : null}
    </ListGroup>
  );
}

/** The owner can start or reopen an Ask Alpha conversation from the Agent activity page. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    return function ActivityConversations() {
      return <ConversationActions runtime={runtime} />;
    };
  },
} satisfies Area;
