import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import type { StartupJournalKind } from "./vocabulary.ts";

export type StartupJournalEntry = {
  /** When it happened, written the way the phone writes times. */
  when: string;
  /** What kind of failure it was. */
  kind: StartupJournalKind;
};

export type StartupJournalProps = {
  /** The failures of the last thirty days, newest last; at most fifty. */
  entries: StartupJournalEntry[];
  /** How many older entries the last reading dropped. */
  dropped?: number;
  /** Clears the journal; offered only in a development build, and only while there is something to clear. */
  onClear?: () => void;
};

const kinds: Record<StartupJournalKind, string> = {
  FailedToStart: "Failed to start",
  FailedToDraw: "Failed to draw",
  Uncaught: "Uncaught error",
  KeptFailing: "Kept failing",
  Crashed: "Crashed",
  StoppedAnswering: "Stopped answering",
};

/**
 * The private record of Alpha's failures on the Developer page of a development build: when and what kind, never a
 * message or a stack.
 * @model spec/app/startup/journal.md
 */
export function StartupJournal({ entries, dropped = 0, onClear }: StartupJournalProps) {
  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <EmptyState title="No failures" />
      ) : (
        <ListGroup heading="Failures">
          {entries.map((entry, index) => (
            <ListRow key={index} title={kinds[entry.kind]} trailing={entry.when} />
          ))}
        </ListGroup>
      )}
      {dropped > 0 ? <p className="px-4 text-sm text-muted-foreground">{dropped} older dropped</p> : null}
      {onClear ? <Button variant="outline" onClick={onClear}>Clear</Button> : null}
    </div>
  );
}
