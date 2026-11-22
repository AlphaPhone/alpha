// spec/maps/plane.md, "The credits panel opens from the badge or the information button of a built plane"; spec/maps/plane.md, "Google content is drawn only on the Google raster, and other content on the world or open raster"
import { Info, X } from "lucide-react";
import type { Credits } from "../../../gen/maps__plane.ts";
import type { Recipient } from "../../maps/maps.schema.vibe";
import { Button } from "../components/ui/index.ts";
import googleBadge from "./google-maps-attribution.svg";

export type MapCreditsProps = {
  credits: Credits;
  /** The copyright of the view in place, in full; never truncated. */
  copyright: string;
  /** The standing attribution when no viewport copyright is shown. */
  attribution: string;
  /** Who receives searches, search areas and route points. */
  recipients: ReadonlyArray<Recipient>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Search by typing a latitude and longitude instead of using location. */
  onCoordinates: () => void;
};

/** Who receives searches and route points, in one sentence, or "" for none. */
export function disclosure(recipients: ReadonlyArray<Recipient>): string {
  const gateway = recipients.find((r) => r.role === "gateway")?.name ?? "Cloud Maps";
  const targets = [gateway, ...recipients.filter((r) => r.role !== "gateway").map((r) => `${r.name} for ${r.role}, operated by ${r.operator}`)];
  return `Searches, search areas and route points are sent to ${targets.join(" and ")}. Cloud keeps only the request type and result, not your searches or locations.`;
}

/**
 * The map's credits: on a Google map only the Google Maps badge, which opens the full copyright and disclosure; elsewhere the credit and an information button.
 * @model spec/maps/plane.md
 * @design design.md
 */
export function MapCredits({ credits, copyright, attribution, recipients, open, onOpen, onClose, onCoordinates }: MapCreditsProps) {
  const text = copyright || attribution;
  return (
    <div className="flex flex-col items-start gap-2">
      {credits === "BadgeOnly" ? (
        <button type="button" aria-label="Google Maps credits" onClick={onOpen} className="rounded-sm">
          <img src={googleBadge} alt="Google Maps" className="h-4" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          {text && <span className="text-xs text-muted-foreground">{text}</span>}
          <Button variant="ghost" size="icon" aria-label="Map information" onClick={onOpen}><Info aria-hidden /></Button>
        </div>
      )}
      {open && (
        <section aria-label="Map information" className="flex max-w-sm flex-col gap-2 rounded-xl bg-card p-4 shadow-lg">
          <div className="flex items-start gap-2">
            <p className="flex-1 whitespace-pre-wrap text-sm">{text}</p>
            <Button variant="ghost" size="icon" aria-label="Close map information" onClick={onClose}><X aria-hidden /></Button>
          </div>
          {recipients.length > 0 && <p className="text-sm text-muted-foreground">{disclosure(recipients)}</p>}
          <p className="text-sm text-muted-foreground">Location access does not share it with your agent.</p>
          <Button variant="secondary" size="sm" onClick={onCoordinates}>Enter coordinates</Button>
        </section>
      )}
    </div>
  );
}
