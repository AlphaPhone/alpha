// spec/inbox/mailbox.md, "Home learns only the unread count of the loaded inbox and whether more mail is beyond it"; spec/inbox/notices.md, "Story: Open the Inbox or ask about the exact notification I tapped"
import { Effect } from "effect";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useMachine as useMailbox } from "../../../gen/inbox__mailbox.react.ts";
import { attentionOf, initial as mailboxInitial } from "../../../gen/inbox__mailbox.ts";
import { useMachine as useNotices } from "../../../gen/inbox__notices.react.ts";
import { initial as noticesInitial } from "../../../gen/inbox__notices.ts";
import { MailNoticesShell } from "../../inbox/notices.vibe";
import type { AppId, AppScreen, AppSurface } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { InboxScreen } from "./InboxScreen.tsx";
import { NoticeAskSheet } from "./NoticeAskSheet.tsx";
import { askFailure } from "./messages.ts";
import { act, ask, runtime } from "./runtime.ts";

/** The review of an Ask notice tap, above every screen. */
function NoticeAskSurface(_: { readonly open: (app: AppId, route?: string) => void }) {
  const { state: notices = noticesInitial } = useNotices(runtime);
  const [failure, setFailure] = useState("");
  return (
    <NoticeAskSheet
      key={notices.token} notices={notices} failure={failure}
      onConfirm={(question) => ask(Effect.flatMap(Effect.service(MailNoticesShell), (n) => n.confirmAsk(question, false)), (f) => setFailure(askFailure[f]))}
      onCancel={(explicit) => act(Effect.flatMap(Effect.service(MailNoticesShell), (n) => n.cancelAsk(explicit)))}
    />
  );
}

/** Home's word about waiting mail: the unread count only, opening the Inbox. */
function MailAttentionSurface({ open }: { readonly open: (app: AppId, route?: string) => void }) {
  const { state: mailbox = mailboxInitial } = useMailbox(runtime);
  const attention = attentionOf(mailbox);
  if (attention.phase !== "AttentionReady" || attention.unread === 0) return null;
  return (
    <Button variant="secondary" aria-label={`Open Inbox: ${attention.unread}${attention.more ? "+" : ""} unread emails`} onClick={() => open("inbox")}>
      <Mail aria-hidden />{attention.unread}{attention.more ? "+" : ""}
    </Button>
  );
}

/** The Inbox app. */
export const screens: AppScreen[] = [{ id: "inbox", title: "Inbox", icon: Mail, availability: "everywhere", Screen: InboxScreen }];

/** The Ask review of a Gmail notice tap, and Home's unread count. */
export const surfaces: AppSurface[] = [
  { id: "inbox-notice-ask", slot: "overlay", availability: "everywhere", Surface: NoticeAskSurface },
  { id: "inbox-attention", slot: "notices", availability: "everywhere", Surface: MailAttentionSurface },
];

export { EmailCardView } from "./EmailCardView.tsx";
