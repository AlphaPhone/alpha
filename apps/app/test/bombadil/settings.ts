// spec/app/settings/index.md, "Every page showing is one this build and phone admit"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const phonePages = extract(({ document }) => [...document.querySelectorAll("button")].filter((button) => ["Network", "Carrier & SIM setup", "Erase all data"].includes(button.textContent ?? "")).length);

/** A browser is no phone, so Settings never offers the pages and the erase that only a phone admits. */
export const settingsPhonePagesAreNotOffered = always(() => phonePages.current === 0);
