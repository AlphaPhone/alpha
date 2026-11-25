// spec/app/settings/activity.md, "Story: Help the agent recover"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"
import { ListGroup, SettingsNavRow } from "@repo/ui";
import { Effect } from "effect";
import { MessageSquarePlus } from "lucide-react";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import { Machine as ShellMachine, canRaise } from "../../gen/app__shell.effect.vibe";
import type { Area } from "../runtime/area.tsx";
import { type AssistantProps } from "./Assistant.tsx";
import { freedom } from "./assistant.vibe";
import assistant from "./index.tsx";

function ConversationActions({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime).state;
  const chats = useChats(runtime);
  const composer = useComposer(runtime).state;
  if (!conversation || !chats.state || !composer) return null;
  const start = { type: "start", ...freedom(conversation, composer, chats.state.chosen) } as const;
  if (!chats.can(start)) return null;
  return (
    <ListGroup>
      <SettingsNavRow title="New conversation" icon={<MessageSquarePlus />} onOpen={() => {
        void chats.send(start).then((result) => {
          if (result._tag !== "Success") return;
          void runtime.runPromiseExit(Effect.gen(function* () {
            const shell = yield* ShellMachine;
            if (canRaise(yield* shell.get(), "Full")) yield* shell.send({ type: "raise", detent: "Full" });
          }));
        });
      }} />
    </ListGroup>
  );
}

/** The owner can start an Ask Alpha conversation without leaving the Agent activity page. */
export default {
  open(alpha) {
    const runtime = assistant.runtime(alpha);
    return function ActivityConversations() {
      return <ConversationActions runtime={runtime} />;
    };
  },
} satisfies Area;
