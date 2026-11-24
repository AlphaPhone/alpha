import { Trash2 } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { SettingsNavRow, type SettingsNavRowProps } from "./SettingsNavRow.tsx";

export type SettingsResetRowProps = Pick<SettingsNavRowProps, "autoFocus" | "onFocus"> & {
  /** The phone's review is open, asking for the device credential: the row spins and starts no second review. */
  reviewing?: boolean;
  /** Asks the phone to show its disclosure and check the device credential; the row is pressable only with it, on the phone, while no reset is pending. */
  onErase?: () => void;
};

/**
 * Erase all data, at the foot of General. The phone shows its own disclosure and decides; this row only asks.
 * @model spec/app/settings/reset.md
 */
export function SettingsResetRow({ reviewing = false, onErase, ...props }: SettingsResetRowProps) {
  return (
    <SettingsNavRow
      title={<span className="text-destructive">Erase all data</span>}
      icon={<Trash2 />}
      value={reviewing ? <Spinner size="sm" label="Waiting for the phone" /> : undefined}
      onOpen={reviewing ? undefined : onErase}
      {...props}
    />
  );
}
