// spec/app/settings/index.md, "Every page showing is one this build and phone admit"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const phoneOnly = ["Network", "Erase all data"];

const phonePages = extract(({ document }) => [...document.querySelectorAll<HTMLButtonElement>("button")].filter((button) => {
  const label = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
  return phoneOnly.some((name) => label === name || label.startsWith(name));
}).length);

/** A browser is no phone, so Settings never offers the pages and the erase that only a phone admits. */
export const settingsPhonePagesAreNotOffered = always(() => phonePages.current === 0);
