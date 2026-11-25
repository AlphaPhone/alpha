import { area } from "../runtime/area.tsx";
import { Effect, Layer } from "effect";
import { Browser } from "./Browser.tsx";
import { back, browser } from "./browser.vibe";
import { cancelHistory, library } from "./library.vibe";
import { sharing } from "./share.vibe";

/** The Browser, at its view (areas.ts): its tabs, kept across restarts, and each tab's page in the phone's tab host. */
export default area(Layer.provideMerge(Layer.merge(library, sharing), browser), Browser, { back: Effect.flatMap(cancelHistory(), (cancelled) => cancelled ? Effect.succeed(true) : back) });
