import { Skeleton } from "../Skeleton.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { SearchField } from "../SearchField.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { ChevronRight, FileText } from "lucide-react";
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
 * Licences: what Alpha is built from, loaded from a file shipped with Alpha, narrowed by a search, each opening its
 * text. The row left is given back when the list shows again.
 * @model spec/app/settings/licences.md
 */
export function SettingsLicencesPage({ load, found, query, licences, onQuery, onOpen, onBack, place, onPlace }: SettingsLicencesPageProps) {
  return (
    <SettingsPage title="Licenses" onBack={onBack} backLabel="Back to About">
      <SearchField aria-label="Search licenses" placeholder="Search components" className="[&>input]:h-15 [&>input]:rounded-group [&>input]:pl-4 [&>svg]:hidden" value={query} onValueChange={(next) => onQuery?.(next)} disabled={load !== "loaded" || !onQuery} />
      {load === "loading" ? <Skeleton className="h-40 rounded-lg" /> : null}
      {load === "failed" ? <EmptyState title="Licenses are unavailable" /> : null}
      {load === "loaded" && found === 0 ? <EmptyState title="No licenses found" /> : null}
      {load === "loaded" && found > 0 && licences.length === 0 ? <EmptyState title="No license matches" /> : null}
      {load === "loaded" && licences.length ? (
        <ListGroup heading={query ? `${licences.length} of ${found}` : `${found} licenses`}>
          {licences.map((licence, index) => (
            <ListRow key={JSON.stringify([licence.name, licence.version, licence.source])} leading={<FileText />} title={licence.name} detail={licence.version ? `${licence.version} · ${licence.licence}` : licence.licence} trailing={<ChevronRight aria-hidden className="size-4" />} onClick={onOpen && (() => onOpen(index))} {...placed({ place, onPlace }, index)} />
          ))}
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
