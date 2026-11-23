// spec/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
import type { Message } from "../../../gen/shell__landing.ts";
import { Button } from "../components/ui/index.ts";

const MESSAGES: Readonly<Record<Message, string>> = {
  MessageChecking: "Your account is checked inside Alpha Phone before the connection is saved.",
  MessageReopened: "This page was reopened. Go back to Alpha Phone to continue or restart authorization.",
  MessageInvalid: "This return link is invalid. Go back to Alpha Phone and reconnect.",
  MessageCancelled: "Authorization was cancelled. Continue to return to Alpha Phone.",
  MessageContinue: "Your account is checked inside Alpha Phone before the connection is saved.",
};

/** The delegation return page: the cleaned hand-back address and its message. */
export interface CallbackLandingProps {
  message: Message;
  /** The one link back into Alpha; empty when the return cannot be used. */
  href: string;
}

/** The delegation return page: one way back into Alpha, offered only for a return it can vouch for. */
export function CallbackLanding({ message, href }: CallbackLandingProps) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="font-display text-3xl">Return to Alpha Phone</h1>
      <p>{MESSAGES[message]}</p>
      {href !== "" && <Button asChild size="lg"><a href={href} rel="noreferrer">Continue in Alpha Phone</a></Button>}
    </main>
  );
}
