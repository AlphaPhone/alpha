// spec/inbox/drafts.md, "Back sets the draft aside, leaving keeps it open, and Drafts reopens it"; spec/inbox/mailbox.md, "Home learns only the unread count of the loaded inbox and whether more mail is beyond it"; spec/inbox/notices.md, "Story: Open the Inbox or ask about the exact notification I tapped"
import { Effect } from "effect";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useMachine as useMailbox } from "../../../gen/inbox__mailbox.react.ts";
import { attentionOf, initial as mailboxInitial } from "../../../gen/inbox__mailbox.ts";
import { useMachine as useNotices } from "../../../gen/inbox__notices.react.ts";
import { initial as noticesInitial } from "../../../gen/inbox__notices.ts";
import { MailNoticesShell } from "../../inbox/notices.vibe";
import { inboxBack } from "../../inbox/back.vibe";
import { Notices } from "../../shell/notices.vibe";
import type { AppId, AppScreen, AppSurface } from "../app-screen.ts";
import { InboxScreen } from "./InboxScreen.tsx";
import { MailAttentionView } from "./MailAttentionView.tsx";
import { NoticeAskSheet } from "./NoticeAskSheet.tsx";
import { askFailure, composerRefusal } from "./messages.ts";
import { runtime } from "./runtime.ts";
import { act, answer, ask } from "../shell/services.ts";

/** The review of an Ask notice tap, above every screen. */
function NoticeAskSurface(_: { readonly open: (app: AppId, route?: string) => void }) {
  const { state: notices = noticesInitial } = useNotices(runtime);
  const [failure, setFailure] = useState("");
  return (
    <NoticeAskSheet
      key={notices.token} notices={notices} failure={failure}
      onConfirm={(question) => answer(Effect.flatMap(Effect.service(MailNoticesShell), (n) => n.confirmAsk(question, false)), (f) => setFailure(askFailure[f]))}
      onCancel={(explicit) => act(Effect.flatMap(Effect.service(MailNoticesShell), (n) => n.cancelAsk(explicit)))}
    />
  );
}

/** Home's word about waiting mail: the unread count only, opening the Inbox. */
function MailAttentionSurface({ open }: { readonly open: (app: AppId, route?: string) => void }) {
  const { state: mailbox = mailboxInitial } = useMailbox(runtime);
  return <MailAttentionView attention={attentionOf(mailbox)} onOpen={() => open("inbox")} />;
}

/** Android's Back in front of the Inbox: true when the composer, an attachment, a message, a selection or a search took it; a draft that could not be set aside says why. */
function back(): Promise<boolean> {
  const step = Effect.flatMap(inboxBack(), (taken) => {
    const refusal = taken.refusal;
    if (refusal === undefined) return Effect.succeed(taken.taken);
    return Effect.as(Effect.flatMap(Effect.service(Notices), (notices) => notices.show(composerRefusal[refusal])), taken.taken);
  });
  return ask(step, false);
}

/** The Inbox app. */
export const screens: AppScreen[] = [{ id: "inbox", title: "Inbox", icon: Mail, availability: "everywhere", Screen: InboxScreen, back }];

/** The Ask review of a Gmail notice tap, and Home's unread count. */
export const surfaces: AppSurface[] = [
  { id: "inbox-notice-ask", slot: "overlay", availability: "everywhere", Surface: NoticeAskSurface },
  { id: "inbox-attention", slot: "notices", availability: "everywhere", Surface: MailAttentionSurface },
];

