import { Eraser } from "lucide-react";
import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { Spinner } from "../Spinner.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { SettingsExportRow, type SettingsExportRowProps } from "./SettingsExportRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsRecoverRow, type SettingsRecoverRowProps } from "./SettingsRecoverRow.tsx";

export type SettingsProblemLogPageProps = Pick<SettingsExportRowProps, "exporting"> & {
  /** What the last read of the log found: still waiting, no problems, some, or that it could not be read. */
  log: "waiting" | "none" | "some" | "unavailable";
  /** How many problems were recorded. */
  problems: number;
  /** The saved stores that cannot be read normally, each with a way to recover it. */
  needs: SettingsRecoverRowProps["store"][];
  /** The log is being cleared. */
  clearing?: boolean;
  /** Goes back to Developer. */
  onBack?: () => void;
  /** Reads the log again; offered while it is unavailable. */
  onRetry?: () => void;
  /** Clears the log; offered only for a log with problems, one clearing at a time. */
  onClear?: () => void;
  /** Shares the log with Alpha's diagnostics. */
  onExport?: () => void;
  /** Recovers a store, or hands it to the area that owns it. */
  onRecover?: (store: SettingsRecoverRowProps["store"]) => void;
};

/**
 * The Problem log of a development build: how many problems Alpha recorded, Clear and Export, and each saved store that
 * cannot be read, with a way to recover it. A failure stays shown until a newer read succeeds.
 * @model spec/app/settings/developer.md
 */
export function SettingsProblemLogPage({ log, problems, needs, clearing = false, exporting, onBack, onRetry, onClear, onExport, onRecover }: SettingsProblemLogPageProps) {
  return (
    <SettingsPage title="Problem log" onBack={onBack} backLabel="Back to Developer">
      <ListGroup>
        {log === "waiting" ? <Skeleton className="m-4 h-5 w-24" /> : null}
        {log === "none" ? <ListRow title="No problems" trailing={<StatusDot status="ok" label="None" />} /> : null}
        {log === "some" ? <ListRow title={`${problems} ${problems === 1 ? "problem" : "problems"}`} trailing={<StatusDot status="warn" label="Recorded" />} /> : null}
        {log === "unavailable" ? (
          <ListRow
            title="The log is unavailable"
            trailing={
              <>
                <StatusDot status="error" label="Unavailable" />
                {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button> : null}
              </>
            }
          />
        ) : null}
      </ListGroup>
      <ListGroup>
        <SettingsExportRow exporting={exporting} onExport={onExport} />
        {log === "some" ? <SettingsNavRow title="Clear" icon={<Eraser />} value={clearing ? <Spinner size="sm" label="Clearing" /> : undefined} onOpen={clearing ? undefined : onClear} /> : null}
      </ListGroup>
      {(log === "none" || log === "some") && needs.length ? (
        <ListGroup heading="Saved data needs recovery">
          {needs.map((store) => <SettingsRecoverRow key={store} store={store} onRecover={onRecover && (() => onRecover(store))} />)}
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
