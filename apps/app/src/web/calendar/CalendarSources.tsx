// spec/calendar/presentation.md, "Story: Choose which calendars I see"; spec/calendar/presentation.md, "Revoked access hides a source at once; hiding the agent calendar is a preference of that account"; spec/calendar/presentation.md, "The Calendars sheet is a modal over the view, opened only with no form or delete sheet open"; spec/calendar/googleLink.md, "Story: See whether my agent's Calendar reaches Google"
import { Sheet, SheetContent, Switch } from "../components/ui/index.ts";
import { GoogleCalendarLink, type GoogleCalendarLinkProps } from "./GoogleCalendarLink.tsx";

/** Which sources Calendar shows, whether each may be read, and the switches that change them. */
export type CalendarSourcesProps = {
  open: boolean;
  /** The agent's calendar shows for the account signed in. */
  agentShown: boolean;
  /** The phone's calendars show. */
  deviceShown: boolean;
  /** The agent's calendar may be read for this account; without it the switch is off and fixed. */
  agentAccess: boolean;
  /** Android lets Alpha read the phone's calendars; without it the switch is off and fixed. */
  deviceAccess: boolean;
  onAgent: (shown: boolean) => void;
  onDevice: () => void;
  onClose: () => void;
  /** The Google Calendar row, shown while an owner is signed in. */
  google?: GoogleCalendarLinkProps;
};

/**
 * "Calendars": show or hide the agent's calendar for this account, and the phone's calendars, on Calendar and Home.
 * @model spec/calendar/presentation.md
 */
export function CalendarSources({ open, agentShown, deviceShown, agentAccess, deviceAccess, onAgent, onDevice, onClose, google }: CalendarSourcesProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" title="Calendars">
        <div className="flex flex-col gap-1 px-5 pb-6">
          <label className="flex min-h-14 items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm">Agent Calendar</span>
              <span className="block text-sm text-muted-foreground">{agentAccess ? "Your agent’s calendar and linked Google calendars" : "Not available for this account"}</span>
            </span>
            <Switch aria-label="Show Agent Calendar" checked={agentAccess && agentShown} disabled={!agentAccess} onCheckedChange={(on) => onAgent(on)} />
          </label>
          <label className="flex min-h-14 items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm">On this phone</span>
              <span className="block text-sm text-muted-foreground">{deviceAccess ? "Android calendars" : "Calendar access is off"}</span>
            </span>
            <Switch aria-label="Show phone calendars" checked={deviceAccess && deviceShown} disabled={!deviceAccess} onCheckedChange={() => onDevice()} />
          </label>
          {google !== undefined && <GoogleCalendarLink {...google} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
