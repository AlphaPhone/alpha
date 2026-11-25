// spec/app/workflows/list.md, "Filter choices are made on a sheet and take effect together, on Done"
import { Button, RadioGroup, RadioGroupItem, Sheet, SheetContent } from "@repo/ui";
import { Check, RotateCw, X } from "lucide-react";
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
  restoreFocus: () => void;
}

/** The unapplied type and status choices on the Workflows filter sheet. */
export function Filters({ listing, can, send, refresh, restoreFocus }: FiltersProps) {
  const dismiss = { type: "dismissFilters" } as const;
  const availableStatuses = entries(statuses).filter(([status]) => status !== "Removed" || listing.owner > 0);
  return (
    <Sheet open={listing.sheet} onOpenChange={(open) => { if (!open && can(dismiss)) send(dismiss); }}>
      <SheetContent title="Filter workflows" overlayClassName="bg-foreground/28 dark:bg-background/28"
        className="inset-x-3 bottom-3 max-h-[calc(100dvh-2rem)] max-w-100 rounded-panel bg-background pt-5 pr-9.5 pb-6 pl-6 text-foreground shadow-none [&>div:first-child]:min-h-11 [&>div:first-child]:justify-center [&_h2]:mr-14 [&_h2]:leading-row"
        onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}
        actions={<Button className="h-12 rounded-full bg-foreground text-prose font-semibold text-background hover:bg-foreground/90"
          onClick={() => send({ type: "applyFilters" })} disabled={!can({ type: "applyFilters" })}>Done</Button>}>
        <Button variant="ghost" size="icon" className="absolute top-5 right-9.5 rounded-full" aria-label="Close filters"
          onClick={() => send(dismiss)}><X aria-hidden /></Button>
        <fieldset className="flex flex-col pt-1">
          <legend className="float-left mb-2 w-full text-label leading-chat font-semibold text-muted-foreground">Type</legend>
          <RadioGroup aria-label="Type" orientation="vertical" loop value={listing.pickedKind} onValueChange={(value) => {
            const kind = entries(kinds).find(([wanted]) => wanted === value)?.[0];
            if (kind !== undefined) {
              const event = { type: "pickKind", wanted: kind } as const;
              if (can(event)) send(event);
            }
          }}>
            {entries(kinds).map(([wanted, label]) => (
              <RadioGroupItem key={wanted} value={wanted} className="h-12 w-full justify-between rounded-lg px-0 text-sm font-normal">
                {label}{listing.pickedKind === wanted && <Check aria-hidden className="size-4.5" />}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="float-left mb-2 w-full text-label leading-chat font-semibold text-muted-foreground">Status</legend>
          <RadioGroup aria-label="Status" orientation="horizontal" loop value={listing.pickedStatus} onValueChange={(value) => {
            const status = availableStatuses.find(([standing]) => standing === value)?.[0];
            if (status !== undefined) {
              const event = { type: "pickStatus", standing: status } as const;
              if (can(event)) send(event);
            }
          }} className="flex-row gap-0.5 rounded-option bg-secondary p-0.75">
            {availableStatuses.map(([standing, label]) => (
              <RadioGroupItem key={standing} value={standing}
                className="h-11 w-auto min-w-0 flex-1 rounded-tab-count px-1 text-meta font-normal data-[state=checked]:bg-background data-[state=checked]:font-semibold">{label}</RadioGroupItem>
            ))}
          </RadioGroup>
        </fieldset>
        <Button variant="ghost" aria-label="Refresh list" className="mt-4 h-12 min-w-11 justify-start rounded-lg px-0"
          disabled={listing.list.status === "Loading"} onClick={() => {
            if (can(dismiss)) send(dismiss);
            refresh();
          }}><RotateCw aria-hidden className="size-4.5" /></Button>
      </SheetContent>
    </Sheet>
  );
}
