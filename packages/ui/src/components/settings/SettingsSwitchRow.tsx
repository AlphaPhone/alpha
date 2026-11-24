import { type ReactNode, useId } from "react";
import { Lock } from "lucide-react";
import { ListRow } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { Switch } from "../Switch.tsx";

export type SettingsSwitchRowProps = {
  /** What the switch decides, in a few words. */
  title: string;
  /** A second line that says what it covers. */
  detail?: ReactNode;
  /** An icon for the row; decorative. */
  icon?: ReactNode;
  /** Whether it is on, as the phone last said. */
  checked: boolean;
  /** Called with the value the owner chose; the row changes only when the phone has saved it. */
  onCheckedChange?: (checked: boolean) => void;
  /** The phone is being asked: the switch waits for its answer. */
  reading?: boolean;
  /** A save is in flight: the row spins, and takes no second choice. */
  saving?: boolean;
  /** The value cannot be changed, as when the phone cannot say what it is: shown with a lock. */
  locked?: boolean;
};

/** A row whose whole surface operates one switch, for a preference the owner changes and the phone keeps. */
export function SettingsSwitchRow({ title, detail, icon, checked, onCheckedChange, reading = false, saving = false, locked = false }: SettingsSwitchRowProps) {
  const id = useId();
  return (
    <ListRow
      asChild
      title={title}
      detail={detail}
      leading={icon}
      disabled={reading || saving || locked || !onCheckedChange}
      trailing={
        <>
          {saving ? <Spinner size="sm" label="Saving" /> : null}
          {locked ? <Lock role="img" aria-label="Locked" className="size-5" /> : null}
          <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={reading || saving || locked || !onCheckedChange} aria-busy={reading || saving || undefined} />
        </>
      }
    >
      <label htmlFor={id} />
    </ListRow>
  );
}
