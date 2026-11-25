import { area } from "../runtime/area.tsx";
import { Effect, Layer } from "effect";
import { Browser } from "./Browser.tsx";
import { reviewing } from "./agent.vibe";
import { back, browser } from "./browser.vibe";
import { cancelHistory, library } from "./library.vibe";
import { cancelPrivateFrame, sharing } from "./share.vibe";
import { site } from "./site.vibe";

const backFromHistory = Effect.flatMap(cancelHistory(), (cancelled) => cancelled ? Effect.succeed(true) : back);

/** The Browser, at its view (areas.ts): its tabs, kept across restarts, and each tab's page in the phone's tab host. */
export default area(Layer.provideMerge(Layer.mergeAll(library, sharing, site, reviewing), browser), Browser, { back: Effect.flatMap(cancelPrivateFrame(), (cancelled) => cancelled ? Effect.succeed(true) : backFromHistory) });
