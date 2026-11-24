// spec/app/home/cards.md, "The mail card shows the unread count, senders and subjects only, never a message body; marked not up to date when Inbox's page is not, and not drawn without an account or a row"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeMailCard } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { opens } from "../../gen/app__home__cards.ts";
import type { Machine as InboxMachine } from "../../gen/app__inbox.effect.vibe";
import { attention } from "../../gen/app__inbox.ts";
import { useMachine as useInbox } from "../../gen/app__inbox.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { Mail } from "../inbox/gmail.vibe";

/** Home's mail card draws only unread summaries already present in Inbox. */
export function MailOnHome({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<InboxMachine | Mail | ShellMachine, unknown> }) {
  const state = useInbox(runtime).state;
  const shell = useShell(runtime);
  if (!state) return null;
  const unread = attention(state);
  if ((unread.standing !== "Ready" && unread.standing !== "Stale") || unread.unread < 1) return null;
  const rows = runtime.runSync(Mail.use((mail) => Effect.succeed(mail.shown(state))));
  const lines = rows.filter(({ card }) => card.isUnread).slice(0, 2).map(({ card }) => ({
    title: card.subject || "No subject",
    detail: card.from.replace(/<[^>]*>/u, "").replace(/"/gu, "").trim() || card.from,
  }));
  if (lines.length === 0) return null;
  const open = { type: "openView", view: opens("MailCard") } as const;
  return <HomeMailCard
    unread={unread.unread}
    more={unread.more}
    lines={lines}
    notCurrent={unread.standing === "Stale"}
    aria-label={`Open Inbox, ${unread.unread}${unread.more ? "+" : ""} unread`}
    disabled={!shell.can(open)}
    onClick={() => void shell.send(open)}
  />;
}
