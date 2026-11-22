// spec/voice/route.md, "Network speech receives my audio, the words used to decide my turn has ended, and the reply text; the phone sends nothing"; spec/voice/conversation.md, "Network voice listens only after its recipient was disclosed and the owner started it"
import { AudioLines, MessageSquare, Mic } from "lucide-react";
import type { Route, Sends } from "../../../gen/voice__route.ts";
import { Button, Sheet, SheetContent } from "../components/ui/index.ts";
import { recipientName } from "./messages.ts";

export interface SpeechDisclosureProps {
  /** The network route about to listen, or undefined when nothing waits. */
  route: Route | undefined;
  /** What that route receives. */
  sends: Sends | undefined;
  /** The owner agrees and starts voice. */
  onContinue: () => void;
  /** The owner closes the sheet without starting. */
  onDismiss: () => void;
}

/** Before network voice first listens: who receives the owner's speech, and what. */
export function SpeechDisclosure({ route, sends, onContinue, onDismiss }: SpeechDisclosureProps) {
  const name = route === undefined ? "" : recipientName(route);
  const rows = sends === undefined ? [] : [
    sends.audio && { icon: Mic, label: "Your voice" },
    sends.endOfTurnWords && { icon: MessageSquare, label: "Your words, to tell when you've finished" },
    sends.replyText && { icon: AudioLines, label: "Alpha's replies, to read them aloud" },
  ].filter((row): row is { icon: typeof Mic; label: string } => row !== false);
  return (
    <Sheet open={route !== undefined} onOpenChange={(open) => !open && onDismiss()}>
      <SheetContent side="bottom" title={`Voice uses ${name}`} className="p-6">
        <ul className="flex flex-col gap-3">
          {rows.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <Icon aria-hidden className="text-primary" />
              {label}
            </li>
          ))}
        </ul>
        <Button onClick={onContinue}>Continue</Button>
      </SheetContent>
    </Sheet>
  );
}
