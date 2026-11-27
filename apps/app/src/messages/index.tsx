import type { Layer } from "effect";
import { say } from "../notices/index.vibe";
import { registered } from "../platform/index.vibe";
import { messagesBack } from "../comms/index.vibe";
import { area, type Resident, type Shown } from "../runtime/ui.tsx";
import { together } from "../runtime/index.vibe";
import { useFirstPageBack } from "../shell/ui.tsx";
import { voiceReported } from "../update/activity.vibe";
import { voiceArea } from "./dictation.vibe";
import { Messages } from "./Messages.tsx";

function MessagesView({ runtime, alpha }: Shown<Resident | Layer.Success<typeof voiceArea>>) {
  const firstPageBack = useFirstPageBack(alpha);
  const openLink = registered("AlphaBrowser") ? (href: string) => {
    void Promise.all([import("../browser/index.tsx"), import("../browser/browser.vibe")])
      .then(([{ default: browser }, { openMessageLink }]) => browser.runtime(alpha).runPromise(openMessageLink(href)))
      .catch(() => false)
      .then((opened) => opened ? undefined : alpha.runtime.runPromise(say("Browser could not open that link", true)));
  } : undefined;
  return <Messages runtime={runtime} onBack={firstPageBack ? () => void alpha.back() : undefined} onOpenLink={openLink} />;
}

/** Messages, at its view: its machine and the composer's are resident. */
export default area(together(voiceArea, voiceReported("messages")), MessagesView, { back: messagesBack });
