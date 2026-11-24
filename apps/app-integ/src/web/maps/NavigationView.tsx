// spec/maps/guidance.md, "A fix guides only when usable, and only for the current session"; spec/maps/guidance.md, "Ending, the provider's retirement, a failed watch or the navigation service ends the session"
import { LocateFixed, Volume2, VolumeX } from "lucide-react";
import type { Guidance } from "../../../gen/maps__guidance.ts";
import type { GuidanceContent } from "../../maps/content.vibe";
import { guidanceDistance, guidanceDuration } from "../../maps/geometry.vibe";
import { bannerOf } from "../../maps/navigation.vibe";
import { Button } from "../components/ui/index.ts";
import { ManeuverIcon } from "./ManeuverIcon.tsx";

/** Guidance as the banner shows it: the session, its route and last fix, voice, and the controls. */
export type NavigationViewProps = {
  guidance: Guidance;
  content: GuidanceContent;
  voiceOn: boolean;
  /** Voice may be offered: the route's content may be read aloud. */
  voiceAllowed: boolean;
  /** The clock for the arrival time. */
  now: number;
  onEnd: () => void;
  onRecenter: () => void;
  onVoice: () => void;
};

/**
 * Turn-by-turn guidance: the next maneuver and its distance, what follows, the time and distance left, and End.
 * @model spec/maps/guidance.md
 * @design design.md
 */
export function NavigationView({ guidance, content, voiceOn, voiceAllowed, now, onEnd, onRecenter, onVoice }: NavigationViewProps) {
  const banner = bannerOf(content.route, content.marks, guidance.step, content.fix);
  const arrived = guidance.phase === "Arrived";
  const rerouting = guidance.phase === "Rerouting";
  const located = content.fix !== undefined && guidance.fixUsable;
  const distance = arrived ? "Arrived" : rerouting ? "Rerouting…" : located ? guidanceDistance(banner.distance, "en-US") : "Locating…";
  const instruction = arrived ? content.destination : rerouting ? "Planning a new route from here"
    : guidance.offRoute ? "Off route. End navigation to plan a new route." : located ? banner.instruction : "Waiting for location";
  const arrival = new Date(now + banner.remainingSeconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <section aria-label="Guidance" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground shadow-lg">
        <ManeuverIcon maneuver={arrived ? "arrive" : banner.maneuver} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-3xl tabular-nums">{distance}</p>
          <p className="truncate text-lg">{instruction}</p>
          {!arrived && !rerouting && banner.then && (
            <p className="flex items-center gap-1 text-sm opacity-80">Then <ManeuverIcon maneuver={banner.then.maneuver} className="size-4" /> {banner.then.instruction}</p>
          )}
        </div>
      </section>
      <section aria-label="Navigation" className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-md">
        <div className="min-w-0 flex-1">
          {arrived ? (
            <p className="font-serif text-2xl">Destination reached</p>
          ) : (
            <>
              <p className="font-serif text-2xl tabular-nums">{guidanceDuration(banner.remainingSeconds)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {`${guidanceDistance(banner.remainingMeters, "en-US")} · arrive ${arrival}${content.route.traffic === "live" ? "" : " · no live traffic"}`}
              </p>
              <p className="font-mono text-xs uppercase text-muted-foreground">{content.screenOff ? "Continues with the screen off" : "Keep Maps open"}</p>
            </>
          )}
        </div>
        {voiceAllowed && !arrived && (
          <Button variant="ghost" size="icon" aria-label="Guidance voice" aria-pressed={voiceOn} onClick={onVoice}>{voiceOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}</Button>
        )}
        {!guidance.follow && !arrived && <Button variant="ghost" size="icon" aria-label="Recenter" onClick={onRecenter}><LocateFixed aria-hidden /></Button>}
        <Button variant="secondary" onClick={onEnd}>End</Button>
      </section>
    </>
  );
}
