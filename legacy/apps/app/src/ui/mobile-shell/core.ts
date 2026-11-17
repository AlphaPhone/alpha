/**
 * The mobile shell without its React components: product registration and
 * theme, canonical view ids and routes, the view registry, the navigation
 * reducer (views, Back, the drawer and the assistant detent), the gesture
 * zones and the one launcher favorites migration. Runtime and background code (agent
 * navigation, voice, capture) import this entry so they never load Home,
 * All apps or a domain view. The feature manifest is here too, so its tooling
 * needs no React.
 */
export { mobileFeatureManifest } from "./feature-manifest";
export {
  MOBILE_SHELL_CANVAS_WIDTH,
  MOBILE_SHELL_EDGE,
  MOBILE_SHELL_HOME_BAR_TOP,
  resolveMobileShellSwipe,
} from "./gestures";
export { navigateMobileShell } from "./navigation";
export {
  defineMobileProductRegistration,
  type MobileProductRegistration,
  type MobileShellAppearance,
  mobileShellThemeVariables,
} from "./product-registration";
export { mobileShellViewPath, mobileShellViewPaths } from "./view-ids";
export { createMobileViewRegistry } from "./view-registry";
