import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ListRow, type ListRowProps } from "../ListRow.tsx";

export type SettingsNavRowProps = Omit<ListRowProps, "onClick" | "trailing" | "asChild" | "children" | "leading" | "value"> & {
  /** An icon for the row; decorative. */
  icon?: ReactNode;
  /** What the page behind the row holds in a word or a state, before the chevron. */
  value?: ReactNode;
  /** Opens the page, or hands over to the area that owns what the row names; the row is pressable only with it. */
  onOpen?: () => void;
};

/** A row that opens a page of Settings, or another area's own screen. */
export function SettingsNavRow({ icon, value, onOpen, ...props }: SettingsNavRowProps) {
  return <ListRow leading={icon} trailing={onOpen ? <>{value}<ChevronRight aria-hidden className="size-5" /></> : value} onClick={onOpen} {...props} />;
}
