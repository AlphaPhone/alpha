import { area } from "../runtime/area.tsx";
import { Browser } from "./Browser.tsx";
import { back, browser } from "./browser.vibe";

/** The Browser, at its view (areas.ts): its tabs, kept across restarts, and each tab's page in the phone's tab host. */
export default area(browser, Browser, { back });
