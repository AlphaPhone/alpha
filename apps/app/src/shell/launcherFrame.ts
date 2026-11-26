// spec/app/shell/index.md, "On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it"

/**
 * On the launcher (`data-alpha-launcher`) an app screen starts under the phone's 44px status bar, or its inset when
 * that is taller, as Sunday's v119 drew Notes (`template.html:2508`, `.notes-layout` padding-top 44px) and Files and
 * Photos (`template.html:1913,3019`, the main header's margin-top 44px).
 */
export const launcherTop = "in-data-[alpha-launcher]:pt-[max(--spacing(11),var(--alpha-native-inset-top,0px),env(safe-area-inset-top))]";

/**
 * The header of an app's first page on the launcher: 56px high, and with no Back its title starts 20px in, as v119's
 * main header did (`template.html:2519,3019,1913`: height 56px, padding 0 8px 0 20px).
 */
export const launcherFirstHeader = "in-data-[alpha-launcher]:min-h-14 in-data-[alpha-launcher]:ps-5";

/** The header of a page inside an app on the launcher: 56px high, as v119's detail header (`template.html:2574`). */
export const launcherInnerHeader = "in-data-[alpha-launcher]:min-h-14";
