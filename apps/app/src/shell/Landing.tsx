// spec/app/shell/landing.md, "Story: Come back to Alpha after authorizing a connection"
import { Alert, Button } from "@repo/ui";
import type { Message } from "../../gen/app__shell__landing.ts";

const said: Readonly<Record<Message, string>> = {
  MessageChecking: "Alpha checks your account before it saves the connection.",
  MessageReopened: "This page was opened again. Go back to Alpha to continue or start again.",
  MessageInvalid: "This return can't be used. Go back to Alpha and connect again.",
  MessageCancelled: "You cancelled the authorization.",
  MessageContinue: "Alpha checks your account before it saves the connection.",
};

export interface LandingPageProps {
  /** What the landing decided to say. */
  message: Message;
  /** The one way back into Alpha; empty for a return the landing cannot vouch for. */
  href: string;
}

/** The landing after a provider's consent page: what it decided, and one way back into Alpha only for a return it vouches for. */
export function LandingPage({ message, href }: LandingPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-background p-6 font-sans text-foreground">
      <h1 className="font-display text-3xl font-light">Back to Alpha</h1>
      <Alert variant={message === "MessageInvalid" ? "destructive" : message === "MessageCancelled" || message === "MessageReopened" ? "warn" : "info"}>{said[message]}</Alert>
      {href !== "" ? <Button asChild size="lg"><a href={href} rel="noreferrer">Continue in Alpha</a></Button> : null}
    </main>
  );
}
