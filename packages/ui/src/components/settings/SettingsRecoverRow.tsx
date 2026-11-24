import { LifeBuoy } from "lucide-react";
import { Spinner } from "../Spinner.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";

export type SettingsRecoverRowProps = {
  /** The saved data that cannot be read. */
  store: "device-preferences" | "device-roles" | "notification-data" | "alert-sounds";
  /** The recovery is in flight: the row spins and takes no second press. */
  busy?: boolean;
  /** Recovers it, or hands it to the area that owns it; the row is pressable only with it. */
  onRecover?: () => void;
};

const titles = {
  "device-preferences": "Recover device settings",
  "device-roles": "Recover device roles",
  "notification-data": "Recover notification data",
  "alert-sounds": "Recover notification sounds",
};

/**
 * Offers to recover saved data that cannot be read.
 * @model spec/app/settings/developer.md
 */
export function SettingsRecoverRow({ store, busy = false, onRecover }: SettingsRecoverRowProps) {
  return <SettingsNavRow title={titles[store]} icon={<LifeBuoy />} value={busy ? <Spinner size="sm" label="Recovering" /> : undefined} onOpen={busy ? undefined : onRecover} />;
}
