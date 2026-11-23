// spec/clock/worldClock.md, "Story: See the time where others are"
import { useState } from "react";
import { Globe, Plus, X } from "lucide-react";
import { canAddZone, canRemoveZone, type WorldClock } from "../../../gen/clock__worldClock.ts";
import { Button, EmptyState, Input, Label, ListRow } from "../components/ui/index.ts";

/** The zones followed, the page's instant, the zones the phone knows, and adding or removing one. */
export type WorldClockPanelProps = {
  /** The zones followed. */
  world: WorldClock;
  /** The page's latest instant. */
  now: number;
  /** The zones the phone knows, for suggestions. */
  known: readonly string[];
  onAdd: (zone: string) => void;
  onRemove: (zone: string) => void;
};

function timeIn(zone: string, now: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(now);
  } catch {
    return "";
  }
}

const city = (zone: string) => zone.split("/").pop()?.replaceAll("_", " ") ?? zone;

/**
 * The time where the owner's people are.
 * @model spec/clock/worldClock.md
 */
export function WorldClockPanel({ world, now, known, onAdd, onRemove }: WorldClockPanelProps) {
  const [zone, setZone] = useState("");
  const addable = known.includes(zone) && canAddZone(world, zone);
  return (
    <section className="flex flex-col gap-6">
      {world.zones.length === 0 ? <EmptyState title="No cities" icon={<Globe className="size-8" />} /> : (
        <ul className="flex flex-col divide-y divide-border">
          {world.zones.map((z) => (
            <li key={z} className="flex items-center">
              <ListRow title={city(z)} detail={z} trailing={<span className="font-display text-2xl text-foreground">{timeIn(z, now)}</span>} className="flex-1" />
              <Button variant="ghost" size="icon" aria-label={`Remove ${city(z)}`} disabled={!canRemoveZone(world, z)} onClick={() => onRemove(z)}><X aria-hidden className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (addable) { onAdd(zone); setZone(""); } }}>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor="world-zone">City</Label>
          <Input id="world-zone" list="world-zones" value={zone} onChange={(e) => setZone(e.target.value)} />
          <datalist id="world-zones">{known.map((z) => <option key={z} value={z} />)}</datalist>
        </div>
        <Button type="submit" size="icon" aria-label="Add city" disabled={!addable}><Plus aria-hidden className="size-4" /></Button>
      </form>
    </section>
  );
}
