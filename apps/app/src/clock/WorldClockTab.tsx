// spec/app/clock/world.md, "Story: Track times around the world"
import { Button, Card, EmptyState, ListGroup, ListRow, SearchField, Sheet, SheetContent } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowDown, ArrowUp, Globe, Plus, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Machine as ClockViewMachine } from "../../gen/app__clock.effect.vibe";
import { useMachine as useClockView } from "../../gen/app__clock.react.ts";
import { useMachine as useWorld } from "../../gen/app__clock__world.react.ts";
import { cityById, formatCityClock, localTimeZone, searchCities } from "./cities.ts";
import { clockRecords } from "./records.ts";
import type { ClockResident } from "./sync.vibe";
import { clockNow } from "./ticker.vibe";
import { formatLocalHero } from "./time.ts";

export interface WorldClockTabProps {
  /** Clock resident machines. */
  runtime: ManagedRuntime.ManagedRuntime<ClockResident | ClockViewMachine, unknown>;
}

/** World Clock tab with local hero clock, pinned city cards, reordering, and city picker sheet. */
export function WorldClockTab({ runtime }: WorldClockTabProps) {
  const world = useWorld(runtime);
  const view = useClockView(runtime);
  const meta = useSyncExternalStore(clockRecords.subscribe, clockRecords.snapshot);
  const now = useSyncExternalStore(clockNow.subscribe, clockNow.snapshot);
  const [query, setQuery] = useState("");

  const hostZone = localTimeZone();
  const cities = world.state?.cities ?? [];
  const hero = now > 0 ? formatLocalHero(now, meta.hour24, hostZone) : undefined;
  const pickerOpen = view.state?.sheet.tag === "AddCity";
  const matches = pickerOpen ? searchCities(query) : [];

  const handleAddCity = (cityId: number) => {
    void world.send({ type: "addCity", cityId });
    setQuery("");
    void view.send({ type: "closeSheet" });
  };

  return (
    <section aria-label="World Clock" className="flex flex-col gap-4">
      <Card className="items-center gap-1 py-6">
        <span className="text-xs font-semibold tracking-caps text-muted-foreground uppercase">Local time</span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-light tabular-nums text-foreground">{hero?.time ?? "--:--:--"}</span>
          {hero?.period && <span className="text-base font-medium text-muted-foreground">{hero.period}</span>}
        </div>
        <span className="text-sm text-muted-foreground">
          {hero ? `${hero.date} · ${hero.zone}` : hostZone}
        </span>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">Pinned cities</span>
        <Button
          size="sm"
          aria-label="Add city"
          disabled={!view.can({ type: "openSheet", sheet: { tag: "AddCity" } })}
          onClick={() => void view.send({ type: "openSheet", sheet: { tag: "AddCity" } })}
        >
          <Plus aria-hidden className="size-4" />
          Add city
        </Button>
      </div>

      {cities.length === 0 ? (
        <EmptyState icon={<Globe aria-hidden />} title="No pinned cities">
          <Button onClick={() => void view.send({ type: "openSheet", sheet: { tag: "AddCity" } })}>
            Add city
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cities.map((cityId, index) => {
            const entry = cityById(cityId);
            if (!entry) return null;
            const reading = now > 0 ? formatCityClock(entry.timeZone, now, meta.hour24, hostZone) : undefined;
            const prevId = index > 0 ? cities[index - 1] : undefined;
            const nextId = index + 1 < cities.length ? cities[index + 1] : undefined;
            return (
              <Card key={entry.id} className="gap-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-foreground">{entry.city}</span>
                    <span className="text-xs text-muted-foreground">
                      {reading ? `${reading.dayDelta}, ${reading.offsetLabel} · ${reading.zoneAbbr}` : entry.region}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-1">
                    <span className="text-2xl font-light tabular-nums text-foreground">{reading?.time ?? "--:--"}</span>
                    {reading?.period && <span className="text-xs font-medium text-muted-foreground">{reading.period}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move ${entry.city} up`}
                    disabled={prevId === undefined}
                    onClick={() => prevId !== undefined && void world.send({ type: "moveCity", cityId: entry.id, onto: prevId, behind: false })}
                  >
                    <ArrowUp aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move ${entry.city} down`}
                    disabled={nextId === undefined}
                    onClick={() => nextId !== undefined && void world.send({ type: "moveCity", cityId: entry.id, onto: nextId, behind: true })}
                  >
                    <ArrowDown aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${entry.city}`}
                    onClick={() => void world.send({ type: "removeCity", cityId: entry.id })}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <Sheet open onOpenChange={(opened) => (opened ? undefined : void view.send({ type: "closeSheet" }))}>
          <SheetContent title="Add city" description="Search over 120 world cities and time zones.">
            <div className="flex flex-col gap-3 py-1">
              <SearchField aria-label="Search cities" placeholder="Search city, country, or timezone" value={query} onValueChange={setQuery} />
              <ListGroup>
                {matches.map((entry) => {
                  const pinned = cities.includes(entry.id);
                  const reading = now > 0 ? formatCityClock(entry.timeZone, now, meta.hour24, hostZone) : undefined;
                  return (
                    <ListRow
                      key={entry.id}
                      title={entry.city}
                      detail={`${entry.region} · ${reading ? reading.offsetLabel : entry.timeZone}`}
                      trailing={pinned ? "Added" : reading ? `${reading.time}${reading.period ? ` ${reading.period}` : ""}` : undefined}
                      disabled={pinned || !world.can({ type: "addCity", cityId: entry.id })}
                      onClick={() => handleAddCity(entry.id)}
                    />
                  );
                })}
              </ListGroup>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}
