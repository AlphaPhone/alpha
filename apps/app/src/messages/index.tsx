import { Layer } from "effect";
import { say } from "../notices/toasts.vibe";
import { registered } from "../platform/device.vibe";
import { messagesBack } from "../phone/back.vibe";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { Messages } from "./Messages.tsx";

function MessagesView({ runtime, alpha }: Shown<Resident>) {
  const openLink = registered("AlphaBrowser") ? (href: string) => {
    void Promise.all([import("../browser/index.tsx"), import("../browser/browser.vibe")])
      .then(([{ default: browser }, { openMessageLink }]) => browser.runtime(alpha).runPromise(openMessageLink(href)))
      .catch(() => false)
      .then((opened) => opened ? undefined : alpha.runtime.runPromise(say("Browser could not open that link", true)));
  } : undefined;
  return <Messages runtime={runtime} onBack={() => void alpha.back()} onOpenLink={openLink} />;
}

/** Messages, at its view: its machine and the composer's are resident. */
export default area(Layer.empty, MessagesView, { back: messagesBack });
