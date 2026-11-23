// spec/telephony/phoneInfo.md, "Story: See my SIM, carrier and number on the image"; spec/telephony/phoneInfo.md, "Without phone-state access the SIM list reads as unread, never as no SIM"; spec/telephony/phoneInfo.md, "An identifier the launcher cannot read is shown on Android's own status screen"
import { ExternalLink } from "lucide-react";
import { imeiElsewhere, simSummary, type PhoneFacts } from "../../../gen/telephony__phoneInfo.ts";
import type { StatusPage } from "../../telephony/phone-info.vibe";
import { Button, Card, ListRow, Skeleton } from "../components/ui/index.ts";
import { holderRows, lineCaption, lineRows, type InfoRow } from "./present.ts";

export interface PhoneInfoViewProps {
  /** What the page read while it is in front. */
  facts: PhoneFacts;
  /** Ask Android for phone-state access, then read again. */
  onAllow: () => void;
  /** Read again after a failed read. */
  onRetry: () => void;
  /** Open one of Android's own settings screens. */
  onOpenStatus: (page: StatusPage) => void;
}

function Rows({ caption, rows }: { caption?: string; rows: readonly InfoRow[] }) {
  return (
    <section aria-label={caption || undefined} className="flex flex-col gap-1">
      {caption && <h2 className="px-1 font-mono text-xs uppercase text-muted-foreground">{caption}</h2>}
      <Card className="divide-y divide-border px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="min-w-0 text-right text-sm break-words">{row.value}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

/**
 * Settings → Phone on the Alpha image: each SIM's carrier, number, network and signal, the apps holding the phone and SMS roles,
 * voicemail setup, and hand-offs to Android's own status and network screens. Nothing here is stored or given to Alpha.
 * @model spec/telephony/phoneInfo.md
 * @design design.md
 */
export function PhoneInfoView({ facts, onAllow, onRetry, onOpenStatus }: PhoneInfoViewProps) {
  if (facts.phase === "InfoReading" || facts.phase === "InfoClosed") {
    return (
      <div aria-busy="true" aria-label="Reading phone details" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (facts.phase === "InfoFailed") {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p role="status" className="text-sm text-muted-foreground">Couldn’t read the phone’s details.</p>
        <Button variant="secondary" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  const summary = simSummary(facts);
  return (
    <div className="flex flex-col gap-4 p-4">
      {summary === "SimsUnread" && (
        <Card className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm">Allow phone access to see your SIM and number.</span>
          <Button size="sm" onClick={onAllow}>Allow</Button>
        </Card>
      )}
      {summary === "NoSim" && <Rows rows={[{ label: "SIM", value: "None" }]} />}
      {facts.lines.map((line) => <Rows key={line.slot} caption={lineCaption(line, facts.lines.length)} rows={lineRows(line)} />)}
      <Rows rows={holderRows(facts.holders, facts.voicemail)} />
      <Card className="divide-y divide-border">
        {imeiElsewhere(facts) && (
          <ListRow title="IMEI" detail="Shown in Android’s device status" onClick={() => onOpenStatus("about")} trailing={<ExternalLink aria-hidden className="size-4" />} />
        )}
        <ListRow title="Mobile network" onClick={() => onOpenStatus("mobile")} trailing={<ExternalLink aria-hidden className="size-4" />} />
        <ListRow title="Default apps" onClick={() => onOpenStatus("default-apps")} trailing={<ExternalLink aria-hidden className="size-4" />} />
      </Card>
    </div>
  );
}
