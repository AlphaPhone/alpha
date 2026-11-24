// spec/app/workflows/list.md, "Filter choices are made on a sheet and take effect together, on Done"
import { Button, Sheet, SheetContent } from "@repo/ui";
import { Check, RotateCw } from "lucide-react";
import type { Event, KindFilter, Listing, StatusFilter } from "../../gen/app__workflows__list.ts";

export const kinds = {
  AllKinds: "All types",
  Reminders: "Reminders",
  Prompts: "Prompts",
  Routines: "Workflows",
  Schedules: "Schedules",
} satisfies Record<KindFilter, string>;
export const statuses = {
  AnyStatus: "All",
  Active: "Active",
  Inactive: "Inactive",
  Removed: "Removed",
} satisfies Record<StatusFilter, string>;

function entries<K extends string>(labels: Record<K, string>) {
  return Object.entries<string>(labels) as [K, string][];
}

interface FiltersProps {
  listing: Listing;
  can: (event: Event) => boolean;
  send: (event: Event) => void;
  refresh: () => void;
}

/** The unapplied type and status choices on the Workflows filter sheet. */
export function Filters({ listing, can, send, refresh }: FiltersProps) {
  return (
    <Sheet open={listing.sheet} onOpenChange={(open) => { if (!open && can({ type: "dismissFilters" })) send({ type: "dismissFilters" }); }}>
      <SheetContent title="Filter workflows" actions={
        <Button onClick={() => send({ type: "applyFilters" })} disabled={!can({ type: "applyFilters" })}>Done</Button>
      }>
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-sm text-muted-foreground">Type</legend>
          {entries(kinds).map(([wanted, label]) => {
            const picked = listing.pickedKind === wanted;
            const event = { type: "pickKind", wanted } as const;
            return <Button key={wanted} variant="ghost" aria-pressed={picked} className="justify-between rounded-md px-2"
              onClick={() => { if (can(event)) send(event); }}>{label}{picked && <Check aria-hidden />}</Button>;
          })}
        </fieldset>
        <fieldset className="my-4">
          <legend className="mb-2 text-sm text-muted-foreground">Status</legend>
          <div className="flex flex-wrap gap-2">
            {entries(statuses).map(([standing, label]) => {
              const picked = listing.pickedStatus === standing;
              const event = { type: "pickStatus", standing } as const;
              return <Button key={standing} variant={picked ? "primary" : "secondary"} size="sm"
                aria-pressed={picked} onClick={() => { if (can(event)) send(event); }}>{label}</Button>;
            })}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" aria-label="Refresh list" disabled={listing.list.status === "Loading"} onClick={() => {
            if (can({ type: "dismissFilters" })) send({ type: "dismissFilters" });
            refresh();
          }}><RotateCw aria-hidden /></Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
