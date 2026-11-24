// spec/app/phone/comms.md, "Story: Address the person or Alpha from one bar"; spec/app/phone/comms.md, "The sheet is closed, open or full, and full never compacts an emergency call"; spec/app/phone/comms.md, "Story: Never lose End"
import { Button } from "@repo/ui";
import { type ManagedRuntime, Option } from "effect";
import { ChevronDown, Phone, PhoneOff } from "lucide-react";
import type { Machine as CallMachine } from "../../gen/app__phone__call.effect.vibe";
import { useMachine as useCall } from "../../gen/app__phone__call.react.ts";
import { barDrawn, shownCall } from "../../gen/app__phone__call.ts";
import type { Machine as MessagesMachine } from "../../gen/app__messages.effect.vibe";
import { useMachine as useMessages } from "../../gen/app__messages.react.ts";
import type { Machine as ContactsMachine } from "../../gen/app__contacts.effect.vibe";
import { useMachine as useContacts } from "../../gen/app__contacts.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { Rows } from "../contacts/contacts.vibe";
import { Conversations, Inbox, titleOf } from "../messages/messages.vibe";
import { useCommsDock } from "./CommsBar.tsx";
import { CallAvatar } from "./CallAvatar.tsx";

/** The current subject of the Phone, Contacts or Messages stage. */
export type CommsTargetServices = CallMachine | MessagesMachine | ContactsMachine | ShellMachine | Rows | Conversations | Inbox;

/** The other target beside Ask Alpha, or its reduced view when Ask Alpha is full. */
export function CommsTarget({ runtime, placement }: {
  runtime: ManagedRuntime.ManagedRuntime<CommsTargetServices, unknown>;
  placement: "composer" | "strip";
}) {
  const shell = useShell(runtime);
  const calls = useCall(runtime);
  const messages = useMessages(runtime).state;
  const contacts = useContacts(runtime).state;
  const dock = useCommsDock(runtime);
  const view = shell.state?.trail.at(-1);
  if (view !== "Phone" && view !== "Messages" && view !== "Contacts") return null;
  const call = calls.state && barDrawn(calls.state) === "LiveBar" ? shownCall(calls.state.calls) : undefined;
  const current = view === "Messages" && messages?.pane === "Conversation"
    ? Option.getOrUndefined(runtime.runSync(Conversations.use((list) => list.get(messages.thread))))
    : undefined;
  const person = current ? titleOf(current.addresses, runtime.runSync(Inbox.use((held) => held.get())).names)
    : view === "Contacts" && contacts?.opened ? runtime.runSync(Rows.use((held) => held.get())).card?.displayName ?? ""
    : "";
  const shouldShowCall = call !== undefined && (view === "Phone" || placement === "strip");
  if (placement === "composer") {
    if (!shouldShowCall && person === "") return null;
    return (
      <Button size="icon" variant="ghost" className="size-11 shrink-0" aria-label={shouldShowCall ? "Back to the call" : `Back to ${view === "Messages" ? "texting " : ""}${person}`} onClick={dock.close}>
        {shouldShowCall ? <Phone /> : <CallAvatar name={person} />}
      </Button>
    );
  }
  const lower = { type: "goBack" } as const;
  const end = { type: "endAsked", callId: call?.id ?? "" } as const;
  return (
    <div aria-label="Current view" className="flex h-13 items-center gap-1 border-b border-border bg-background px-3">
      <Button variant="ghost" className="min-w-0 flex-1 justify-start" onClick={shell.can(lower) ? () => void shell.send(lower) : undefined}>
        {shouldShowCall ? <Phone /> : person === "" ? null : <CallAvatar name={person} />}
        <span className="min-w-0 flex-1 truncate text-left">{shouldShowCall ? "Ongoing call" : person === "" ? view : `${person} · ${view}`}</span>
        <ChevronDown aria-hidden />
      </Button>
      {shouldShowCall && calls.can(end) && <Button size="icon" variant="destructive" aria-label="End call" onClick={() => void calls.send(end)}><PhoneOff /></Button>}
    </div>
  );
}
