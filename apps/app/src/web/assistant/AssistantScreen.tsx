// spec/assistant/index.md, "Story: Ask my assistant from anywhere"; spec/assistant/receipts.md, "Story: Settle an action whose outcome is unknown"
import { Effect } from "effect";
import { ArrowLeft } from "lucide-react";
import type { ScreenProps } from "../app-screen.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { Button } from "../components/ui/index.ts";
import { AgentActivity } from "./AgentActivity.tsx";
import { ChatPanel } from "./ChatPanel.tsx";
import { leaveActivity, openFromAssistant } from "./services.ts";
import { act } from "../shell/services.ts";

/** The shell's screen props: the route `activity` shows Agent activity. */
export type AssistantScreenProps = ScreenProps;

/**
 * The full assistant: the same conversation as the dock, on a screen of its own; the route `activity` shows Agent activity.
 * @model spec/assistant/send.md
 */
export function AssistantScreen({ route, onClose }: AssistantScreenProps) {
  const activity = route === "activity";
  return (
    <main className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      {activity
        ? <AgentActivity onBack={leaveActivity} />
        : (
          <>
            <header className="flex items-center gap-2 px-3 py-2">
              <Button size="icon" variant="ghost" aria-label="Back" onClick={onClose}><ArrowLeft className="size-5" /></Button>
              <h1 className="font-display text-2xl">Alpha</h1>
            </header>
            <div className="min-h-0 flex-1">
              <ChatPanel open={openFromAssistant} onTalk={() => act(Effect.flatMap(Effect.service(Assistant), (assistant) => assistant.requestVoice()))} />
            </div>
          </>
        )}
    </main>
  );
}
