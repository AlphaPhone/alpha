import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { agent } from "./agent.vibe";
import { Browser } from "./Browser.tsx";
import { back, browser } from "./browser.vibe";

/** The Browser, at its view (areas.ts): its tabs, kept across restarts, each tab's page in the phone's tab host, and the page the agent proposed. */
export default area(Layer.merge(browser, agent), Browser, { back });
