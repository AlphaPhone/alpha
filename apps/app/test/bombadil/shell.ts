// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const imageOnly = ["Phone", "Messages", "Contacts"];

const imageApps = extract(({ document }) => [...document.querySelectorAll<HTMLButtonElement>("button")].filter((button) => {
  const label = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
  return imageOnly.some((name) => label === name || label.startsWith(`${name} `) || label.startsWith(`${name}\n`));
}).length);

/** A browser is no Alpha image, so its Home never offers the apps only an image admits. */
export const shellImageAppsAreNotOffered = always(() => imageApps.current === 0);
