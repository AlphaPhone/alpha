import { ChevronRight, FileText } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { placed, type SettingsPlaceProps } from "./vocabulary.ts";

/** A licence in the list: what it is for and the licence it is under. */
export type SettingsLicenceItem = { name: string; licence: string; version?: string; source?: string };

export type SettingsLicencesPageProps = SettingsPlaceProps & {
  /** How the load of the licence file stands: under way, done, or failed. */
  load: "loading" | "loaded" | "failed";
  /** How many licences the load found. */
  found: number;
  /** The words searched for. */
  query: string;
  /** The licences that match the search, from the top of the list. */
  licences: SettingsLicenceItem[];
  /** Called with the text typed into the search. */
  onQuery?: (query: string) => void;
  /** Opens a licence, by its place in the list shown. */
  onOpen?: (index: number) => void;
  /** Goes back to About. */
  onBack?: () => void;
};

/**
 * Licences: what Alpha is built from, loaded from a file shipped with Alpha, narrowed by a search on its own card, each
 * opening its text. The row left is given back when the list shows again.
 * @model spec/app/settings/licences.md
 */
export function SettingsLicencesPage({ load, found, query, licences, onQuery, onOpen, onBack, place, onPlace }: SettingsLicencesPageProps) {
  return (
    <SettingsPage title="Licenses" onBack={onBack} backLabel="Back to About">
      <ListGroup>
        <div className="px-4 py-2">
          <input
            type="search"
            aria-label="Search licenses"
            placeholder="Search components"
            value={query}
            onChange={(event) => onQuery?.(event.target.value)}
            disabled={load !== "loaded" || !onQuery}
            className={cn(focusRing, "min-h-11 w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50")}
          />
        </div>
      </ListGroup>
      {load === "loading" ? (
        <ListGroup>
          <ListRow title="Licenses" aria-label="Loading license notices" trailing={<Spinner size="sm" label="Working" />} />
        </ListGroup>
      ) : null}
      {load === "failed" ? <ListGroup><SettingsFactRow title="Unavailable" /></ListGroup> : null}
      {load === "loaded" && licences.length === 0 ? <ListGroup><SettingsFactRow title={found === 0 ? "No licenses found" : "No matches"} /></ListGroup> : null}
      {load === "loaded" && licences.length ? (
        <ListGroup>
          {licences.map((licence, index) => (
            <ListRow key={JSON.stringify([licence.name, licence.version, licence.source])} leading={<FileText />} title={licence.name} detail={licence.version ? `${licence.version} · ${licence.licence}` : licence.licence} trailing={<ChevronRight aria-hidden className="size-4" />} onClick={onOpen && (() => onOpen(index))} {...placed({ place, onPlace }, index)} />
          ))}
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
