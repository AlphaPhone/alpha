// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";
export * from "@antithesishq/bombadil/browser/defaults";

const imageApps = extract(({ document }) => [...document.querySelectorAll("button")].filter((button) => ["Phone", "Messages", "Contacts"].includes(button.textContent ?? "")).length);

/** A browser is no Alpha image, so its Home never offers the apps only an image admits. */
export const imageAppsAreNotOffered = always(() => imageApps.current === 0);
