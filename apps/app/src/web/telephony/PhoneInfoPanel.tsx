// spec/telephony/phoneInfo.md, "The page reads only while it is in front, and leaving forgets what it read"
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useMachine as usePhoneFactsMachine } from "../../../gen/telephony__phoneInfo.react.ts";
import { initial as factsInitial } from "../../../gen/telephony__phoneInfo.ts";
import { PhoneInfoView as PhoneFacts } from "../../telephony/phone-info.vibe";
import { Button } from "../components/ui/index.ts";
import { goBack } from "./open.ts";
import { PhoneInfoView } from "./PhoneInfoView.tsx";
import { act, answer, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** Settings → Phone takes nothing from Phone: it reads the app's runtime. */
export type PhoneInfoPanelProps = Record<string, never>;

/**
 * Settings → Phone, reached at Phone's `info` route: reads while it is mounted and in front, and forgets on leaving.
 * @model spec/telephony/phoneInfo.md
 * @design design.md
 */
export function PhoneInfoPanel(_props: PhoneInfoPanelProps) {
  const { state: facts = factsInitial } = usePhoneFactsMachine(runtime);
  const [notice, setNotice] = useState("");
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    return start(PhoneFacts.use((v) => v.visit()));
  }, []);
  return (
    <section ref={visit} aria-label="Phone details" className="flex h-full flex-col overflow-y-auto bg-background text-foreground">
      <header className="flex items-center gap-2 px-4 pt-4">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack}><ArrowLeft aria-hidden /></Button>
        <h1 className="flex-1 font-display text-2xl">Phone</h1>
      </header>
      {notice && <p role="status" className="px-4 pt-2 text-sm text-muted-foreground">{notice}</p>}
      <PhoneInfoView
        facts={facts}
        onAllow={() => act(PhoneFacts.use((v) => v.allow()))}
        onRetry={() => act(PhoneFacts.use((v) => v.refresh()))}
        onOpenStatus={(page) => {
          setNotice("");
          answer(PhoneFacts.use((v) => v.openStatus(page)), (opened) => setNotice(opened ? "" : "Couldn’t open Android’s settings."));
        }}
      />
    </section>
  );
}
