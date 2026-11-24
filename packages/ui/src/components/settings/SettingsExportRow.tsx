import { Share2 } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { SettingsNavRow, type SettingsNavRowProps } from "./SettingsNavRow.tsx";

export type SettingsExportRowProps = Pick<SettingsNavRowProps, "autoFocus" | "onFocus"> & {
  /** An export is starting: the row spins and starts no second one. */
  exporting?: boolean;
  /** Shares the problem log with Alpha's diagnostics; the row is pressable only with it. */
  onExport?: () => void;
};

/**
 * Export diagnostics: shares the problems Alpha recorded with its diagnostics, one export at a time.
 * @model spec/app/settings/developer.md
 */
export function SettingsExportRow({ exporting = false, onExport, ...props }: SettingsExportRowProps) {
  return <SettingsNavRow title="Export diagnostics" icon={<Share2 />} value={exporting ? <Spinner size="sm" label="Exporting" /> : undefined} onOpen={exporting ? undefined : onExport} {...props} />;
}
