import { Smartphone } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { SettingsNavRow, type SettingsNavRowProps } from "./SettingsNavRow.tsx";

export type SettingsSetAsHomeRowProps = Pick<SettingsNavRowProps, "autoFocus" | "onFocus"> & {
  /** Android's dialog is open: the row spins and takes no second request. */
  requesting?: boolean;
  /** Asks Android to make Alpha the Home app; the row is pressable only with it, when the phone offers it. */
  onRequest?: () => void;
};

/**
 * Makes Alpha the Home app by Android's own dialog; what Android then says, not what Alpha hoped, is shown by the role.
 * @model spec/app/settings/facts.md
 */
export function SettingsSetAsHomeRow({ requesting = false, onRequest, ...props }: SettingsSetAsHomeRowProps) {
  return (
    <SettingsNavRow
      title="Set as Home"
      icon={<Smartphone />}
      value={requesting ? <Spinner size="sm" label="Waiting for Android" /> : undefined}
      onOpen={requesting ? undefined : onRequest}
      {...props}
    />
  );
}
