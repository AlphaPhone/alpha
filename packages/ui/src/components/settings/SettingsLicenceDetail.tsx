import { ListGroup } from "../ListGroup.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";

export type SettingsLicenceDetailProps = {
  /** What the licence is for. */
  name: string;
  /** The licence it is under, such as MIT. */
  licence: string;
  /** The version of what the licence is for. */
  version?: string;
  /** What the licence obliges, each by Alpha's name for its flag, or as written where Alpha has none. */
  flags?: string[];
  /** The source location shipped in the notice. */
  source?: string;
  /** The licence text, as shipped. */
  text: string;
  /** Goes back to the list, at the same search. */
  onBack?: () => void;
};

/** A titled block of text the owner can select, such as the source or the licence itself. */
function Legal({ label, text }: { label: string; text: string }) {
  return (
    <ListGroup>
      <div className="px-4.5 py-4 select-text">
        <p className="mb-2.5 text-caption text-muted-foreground">{label}</p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>
      </div>
    </ListGroup>
  );
}

/**
 * One licence: what it is for, its version and licence, where its source is, what it obliges, and its text, each on its
 * own card.
 * @model spec/app/settings/licences.md
 */
export function SettingsLicenceDetail({ name, licence, version, flags = [], source, text, onBack }: SettingsLicenceDetailProps) {
  return (
    <SettingsPage title="License details" onBack={onBack} backLabel="Back to Licenses">
      <ListGroup>
        <SettingsFactRow title={name} reading={{ word: "reported", value: version ? `${version} · ${licence}` : licence }} />
      </ListGroup>
      {source ? <Legal label="Source" text={source} /> : null}
      {flags.length ? (
        <ListGroup aria-label="What it obliges">
          <p className="flex gap-3 px-4.5 py-1.75 text-badge leading-normal tabular-nums">
            <span className="whitespace-nowrap text-muted-foreground">Flagged</span>
            <span className="min-w-0 break-words">{flags.join(" · ")}</span>
          </p>
        </ListGroup>
      ) : null}
      <Legal label="License and notices" text={text || "License text missing"} />
    </SettingsPage>
  );
}
