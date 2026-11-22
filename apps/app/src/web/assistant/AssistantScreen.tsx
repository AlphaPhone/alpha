// spec/assistant/index.md, "Story: Ask my assistant from anywhere"
import { Effect } from "effect";
import { ArrowLeft } from "lucide-react";
import type { ScreenProps } from "../app-screen.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { Button } from "../components/ui/index.ts";
import { ChatPanel } from "./ChatPanel.tsx";
import { run } from "./runtime.ts";

export type AssistantScreenProps = ScreenProps & {
  /** Open another app from a card or a reply. */
  openApp?: (app: string, route?: string) => void;
};

/**
 * The full assistant: the same conversation as the dock, on a screen of its own.
 * @model spec/assistant/send.md
 */
export function AssistantScreen({ onClose, openApp }: AssistantScreenProps) {
  return (
    <main className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-2 px-3 py-2">
        <Button size="icon" variant="ghost" aria-label="Back" onClick={onClose}><ArrowLeft className="size-5" /></Button>
        <h1 className="font-serif text-2xl">Alpha</h1>
      </header>
      <div className="min-h-0 flex-1">
        <ChatPanel open={(app, route) => openApp?.(app, route)} onTalk={() => run(Effect.flatMap(Effect.service(Assistant), (assistant) => assistant.requestVoice()))} />
      </div>
    </main>
  );
}
