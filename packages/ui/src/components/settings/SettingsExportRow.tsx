import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { SettingsNavRow, type SettingsNavRowProps } from "./SettingsNavRow.tsx";

export type SettingsExportRowProps = Pick<SettingsNavRowProps, "autoFocus" | "onFocus"> & {
  /** What the row is called where it stands: Export diagnostics, or Export on the Problem log. */
  title?: string;
  /** The row's icon, a share mark unless the page draws its rows with another. */
  icon?: ReactNode;
  /** An export is starting: the row spins and starts no second one. */
  exporting?: boolean;
  /** Shares the problem log with Alpha's diagnostics; the row is pressable only with it. */
  onExport?: () => void;
};

/**
 * Export diagnostics: shares the problems Alpha recorded with its diagnostics, one export at a time.
 * @model spec/app/settings/developer.md
 */
export function SettingsExportRow({ title = "Export diagnostics", icon = <Share2 />, exporting = false, onExport, ...props }: SettingsExportRowProps) {
  return <SettingsNavRow title={title} icon={icon} value={exporting ? <Spinner size="sm" label="Exporting" /> : undefined} onOpen={exporting ? undefined : onExport} {...props} />;
}
