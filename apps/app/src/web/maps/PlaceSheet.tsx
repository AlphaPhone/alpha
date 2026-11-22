// spec/maps/screen.md, "A place opens from a result, a saved place, a pin, the phone's position or the agent"; spec/maps/vocabulary.md, "A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken"; spec/maps/savedPlaces.md, "A place is saved with a name and a valid identity; saving it again updates the same row"
import { Bookmark, BookmarkCheck, Copy, Globe, Pencil, Phone, Share2, Navigation, X } from "lucide-react";
import { useState } from "react";
import type { Phase } from "../../../gen/maps__screen.ts";
import type { Shown } from "../../maps/content.vibe";
import { coordinateLabel } from "../../maps/geometry.vibe";
import { Button, Input, Skeleton } from "../components/ui/index.ts";

export type PlaceSheetProps = {
  shown: Shown;
  /** The provider details' phase; details are shown only once they belong to this place. */
  details: Phase;
  /** The place is Google's: no save, share, rename or copy. */
  restricted: boolean;
  /** The place is saved on this phone. */
  saved: boolean;
  /** Directions are offered: verified details and a provider mode. */
  canDirections: boolean;
  /** Phone exists on this build, so Call is offered. */
  canCall: boolean;
  onDirections: () => void;
  onToggleSaved: (label: string) => void;
  onRename: (label: string) => void;
  onShare: () => void;
  onCall: (phone: string) => void;
  onCopy: (phone: string) => void;
  onWebsite: (url: string) => void;
  onClose: () => void;
};

/**
 * The place sheet: its name, where it is, the provider's hours, phone and website, and what the owner may do with it.
 * @model spec/maps/screen.md
 * @design design.md
 */
export function PlaceSheet(p: PlaceSheetProps) {
  const [editing, setEditing] = useState<string | undefined>();
  const place = p.shown.place && p.shown.place.id === p.shown.providerPlaceId ? p.shown.place : undefined;
  const name = p.shown.label === "Your location" ? "My location" : p.shown.label;
  const dialable = place?.phone && /^\+?[0-9]+$/.test(place.phone.replace(/[() .-]/g, "")) ? place.phone : undefined;
  return (
    <section aria-label={name} className="flex flex-col gap-3 p-4">
      <header className="flex items-start gap-2">
        {editing === undefined ? (
          <h2 className="flex-1 font-serif text-2xl">{name}</h2>
        ) : (
          <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); p.onRename(editing); setEditing(undefined); }}>
            <Input aria-label="Place name" value={editing} maxLength={300} onChange={(e) => setEditing(e.target.value)} />
            <Button type="submit" size="sm">Save name</Button>
          </form>
        )}
        {!p.restricted && editing === undefined && (p.saved || !p.shown.providerPlaceId) && (
          <Button variant="ghost" size="icon" aria-label="Rename" onClick={() => setEditing(p.shown.label)}><Pencil aria-hidden /></Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Close" onClick={p.onClose}><X aria-hidden /></Button>
      </header>
      <p className="text-muted-foreground">{place?.address ?? coordinateLabel(p.shown.coordinate)}</p>
      {p.details === "Loading" && <Skeleton className="h-5 w-2/3" />}
      {place?.openingHours && <p>{place.openingHours}</p>}
      {place?.phone && (
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{place.phone}</span>
          {p.canCall && dialable && <Button variant="ghost" size="icon" aria-label="Call" onClick={() => p.onCall(dialable)}><Phone aria-hidden /></Button>}
          {!p.restricted && <Button variant="ghost" size="icon" aria-label="Copy number" onClick={() => p.onCopy(place.phone!)}><Copy aria-hidden /></Button>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {p.canDirections && <Button onClick={p.onDirections}><Navigation aria-hidden />Directions</Button>}
        {(!p.restricted || p.saved) && (
          <Button variant="secondary" aria-pressed={p.saved} onClick={() => p.onToggleSaved(p.shown.label)}>
            {p.saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}{p.saved ? "Saved" : "Save"}
          </Button>
        )}
        {!p.restricted && <Button variant="secondary" size="icon" aria-label="Share" onClick={p.onShare}><Share2 aria-hidden /></Button>}
        {place?.website && <Button variant="secondary" size="icon" aria-label="Website" onClick={() => p.onWebsite(place.website!)}><Globe aria-hidden /></Button>}
      </div>
    </section>
  );
}
