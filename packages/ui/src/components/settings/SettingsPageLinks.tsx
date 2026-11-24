import type { ReactNode } from "react";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

/** A page that hangs from the one showing. */
export type SettingsPageLink = { page: SettingsPageName; title: string; icon: ReactNode };

export type SettingsPageLinksProps = SettingsPlaceProps & {
  /** The pages that hang from this one, in the order shown. */
  links: SettingsPageLink[];
  /** The slot of the first link on the page, so each row keeps its number whatever rows are shown around it. */
  first?: number;
  /** Opens a page; a row is pressable only with it. */
  onOpen?: (page: SettingsPageName) => void;
};

/**
 * The rows that open the pages hanging from this one, each at its own slot, so Back can return to the row left.
 * @model spec/app/settings/index.md
 */
export function SettingsPageLinks({ links, first = 0, onOpen, place, onPlace }: SettingsPageLinksProps) {
  return (
    <>
      {links.map(({ page, title, icon }, index) => (
        <SettingsNavRow key={page} title={title} icon={icon} onOpen={onOpen && (() => onOpen(page))} {...placed({ place, onPlace }, first + index)} />
      ))}
    </>
  );
}
