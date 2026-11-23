// spec/calendar/googleLink.md, "Story: See whether my agent's Calendar reaches Google"; spec/calendar/googleLink.md, "Story: Link a Google calendar I can write to, and be told it is synced only when it is"; spec/calendar/googleLink.md, "Story: Disconnect Google from Calendar without leaving sync running"
import { useState } from "react";
import type { GoogleLink, GoogleRow, LinkMessage, PauseReport } from "../../../gen/calendar__googleLink.ts";
import { Button, Spinner } from "../components/ui/index.ts";

/** Calendar's Google Calendar row: what the account read says, the last setup and the last disconnect's pause. */
export type GoogleCalendarLinkProps = {
  row: GoogleRow;
  link: GoogleLink;
  /** The Google account of the linked calendar, when one was read back. */
  destination: string;
  held: number;
  running: boolean;
  pause: PauseReport | undefined;
  onLink: () => void;
  onCancel: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
};

const ROW_WORDS: Readonly<Record<GoogleRow, string>> = {
  RowConnected: "Connected", RowFinishSetup: "Finish setup", RowNotConnected: "Not connected", RowCouldNotCheck: "Couldn’t check",
};

/** The words for how a setup ended, as the owner reads them under the Google Calendar row. */
export function linkWords(message: LinkMessage, destination: string, held: number): string {
  switch (message) {
    case "Linked": return destination === "" ? "Synced" : `Synced · ${destination}`;
    case "StillSyncing": return "Syncing";
    case "WaitingForDispatch": return "Waiting";
    case "ConflictHeld": case "ConflictMany": return `Unconfirmed · ${held} held`;
    case "DestinationUnapproved": return "Wrong account";
    case "ControlChanged": return "Changed elsewhere";
    case "DestinationMissing": return "Calendar unavailable";
    case "ChoosePrimary": return "Choose calendar in Google";
    case "ReadOnlyAccess": return "Read-only";
    case "NotConnected": return "Not connected";
    case "Stopped": return "Not finished";
    case "DraftOpen": return "Finish draft first";
    case "NotReady": return "Calendar not ready";
    case "UnsentReview": case "UnsentWrite": case "UnsentTransport": return "Not synced";
    case "UnconfirmedAbort": case "UnconfirmedReview": case "UnconfirmedWrite": case "UnconfirmedTransport": case "UnconfirmedLinks": return "Unconfirmed";
    case "NoLinkMessage": return "";
  }
}

const PAUSE_WORDS: Readonly<Record<PauseReport, string>> = {
  PauseNotNeeded: "", PauseConfirmed: "Calendar sync paused", PauseUnknown: "Calendar sync pause not confirmed",
};

/**
 * The Google Calendar row of the Calendars sheet: Connected, Finish setup, Not connected or Couldn't check; Sync with Google from a
 * write grant, Connect otherwise; and a disconnect that pauses Calendar sync before Google's access is revoked.
 * @model spec/calendar/googleLink.md
 */
export function GoogleCalendarLink({ row, link, destination, held, running, pause, onLink, onCancel, onConnect, onDisconnect }: GoogleCalendarLinkProps) {
  const [confirming, setConfirming] = useState(false);
  const result = link.phase === "LinkDone" ? linkWords(link.message, destination, held) : "";
  const paused = pause === undefined ? "" : PAUSE_WORDS[pause];
  return (
    <section aria-label="Google Calendar" className="flex flex-col gap-2 py-2">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm">Google Calendar</span>
          <span className="block text-sm text-muted-foreground">{ROW_WORDS[row]}</span>
        </span>
        {running ? (
          <span className="flex items-center gap-2">
            <Spinner label="Connecting Calendar with Google" />
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </span>
        ) : row === "RowConnected" ? (
          <Button variant="outline" size="sm" aria-label="Sync Calendar with Google" onClick={onLink}>Sync</Button>
        ) : (
          <Button variant="outline" size="sm" aria-label={row === "RowFinishSetup" ? "Update Calendar access" : "Connect Google Calendar"} onClick={onConnect}>
            {row === "RowFinishSetup" ? "Finish setup" : "Connect"}
          </Button>
        )}
      </div>
      {result !== "" && <p role="status" className="text-sm text-muted-foreground">{result}</p>}
      {paused !== "" && <p role="status" className={pause === "PauseUnknown" ? "text-sm text-warn" : "text-sm text-muted-foreground"}>{paused}</p>}
      {row !== "RowNotConnected" && (
        confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">Calendar sync pauses first. Events stay in Google. Alpha loses access.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => { setConfirming(false); onDisconnect(); }}>Disconnect</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
            </div>
          </div>
        ) : <Button variant="ghost" size="sm" className="self-start" disabled={running} onClick={() => setConfirming(true)}>Disconnect Google</Button>
      )}
    </section>
  );
}
