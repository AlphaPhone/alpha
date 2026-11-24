// spec/platform/index.md, "The build is the browser page off the phone, the AOSP image where the image says so, and the launcher otherwise"; spec/platform/index.md, "A capability is offered only on a variant whose build registers its plugin"; spec/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks"; spec/platform/index.md, "A built page runs only its own scripts"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const AOSP_APPS = ['[data-alpha-app="phone"]', '[data-alpha-app="messages"]', '[data-alpha-app="contacts"]'].join(", ");

const offThePhoneIsTheBrowser = extract(({ document, window }) => {
  const variant = document.documentElement.dataset.alphaVariant;
  const native = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;
  return variant === undefined || native || variant === "browser";
});

const aospAppsOnlyOnTheImage = extract(({ document }) =>
  document.documentElement.dataset.alphaVariant === "aosp" || document.querySelector(AOSP_APPS) === null);

const buildMarked = extract(({ document }) => {
  const root = document.documentElement.dataset;
  if (root.alphaVariant === undefined) return true;
  return ["launcher", "aosp", "browser"].includes(root.alphaVariant) && (root.testMocks === "true" || root.testMocks === "false");
});

/** A page Bombadil drives off the phone always says it is the browser variant, whatever its query or storage claims. */
export const platformThePageOffThePhoneIsTheBrowser = always(() => offThePhoneIsTheBrowser.current);

/** Phone, Messages and Contacts are never shown outside the Alpha AOSP image. */
export const platformAospAppsOnlyOnTheImage = always(() => aospAppsOnlyOnTheImage.current);

/** Once the build has marked the page it names one variant and says whether it allows test mocks, so no surface reads a guess. */
export const platformTheBuildIsMarkedOnce = always(() => buildMarked.current);

const ownScripts = extract(({ document, window }) =>
  Array.from(document.scripts).every((script) => script.src === "" || new URL(script.src).origin === window.location.origin));

/** The page loads scripts only from its own origin. */
export const platformThePageRunsOnlyItsOwnScripts = always(() => ownScripts.current);
