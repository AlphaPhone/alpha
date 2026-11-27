import { Effect, type Layer } from "effect";
import { say } from "../notices/toasts.vibe";
import { registered } from "../platform/device.vibe";
import { messagesBack } from "../phone/back.vibe";
import { area, type Resident, type Shown } from "../runtime/area.tsx";
import { together } from "../runtime/reactor.vibe";
import { useFirstPageBack } from "../shell/AppBack.tsx";
import { voiceReported } from "../update/activity.vibe";
import { voiceArea } from "./dictation.vibe";
import { Messages } from "./Messages.tsx";

function MessagesView({ runtime, alpha }: Shown<Resident | Layer.Success<typeof voiceArea>>) {
  const firstPageBack = useFirstPageBack(alpha);
  const openLink = registered("AlphaBrowser") ? (href: string) => {
    void runtime.runPromiseExit(Effect.gen(function* () {
      const opened = yield* Effect.tryPromise(async (signal) => {
        const [{ default: browser }, { openMessageLink }] = await Promise.all([import("../browser/index.tsx"), import("../browser/browser.vibe")]);
        if (signal.aborted) return false;
        return browser.runtime(alpha).runPromise(openMessageLink(href), { signal });
      }).pipe(Effect.orElseSucceed(() => false));
      if (!opened) yield* say("Browser could not open that link", true);
    }));
  } : undefined;
  return <Messages runtime={runtime} onBack={firstPageBack ? () => void alpha.back() : undefined} onOpenLink={openLink} />;
}

/** Messages, at its view: its machine and the composer's are resident. */
export default area(together(voiceArea, voiceReported("messages")), MessagesView, { back: messagesBack });
