// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { type AskScene, askRoutes, askScene } from "./ask.ts";
import { type Route, answering } from "./routes.ts";
import { type SampleScene, sampleRoutes, sampleScene } from "./sample.ts";

/** Everything the fake world holds, one field per area; a journey reads and changes it. */
export interface Scene {
  image: boolean;
  textScale: number;
  readonly secrets: Map<string, string>;
  /** The hardware Back and Home: a journey dispatches `new CustomEvent("press", { detail: "back" })`. */
  readonly buttons: EventTarget;
  readonly sample: SampleScene;
  readonly ask: AskScene;
}

export function scene(): Scene {
  return { image: false, textScale: 1, secrets: new Map(), buttons: new EventTarget(), sample: sampleScene(), ask: askScene() };
}

/** Which button a press dispatched on `Scene.buttons` stands for. @throws {never} */
export function pressed(event: Event): "back" | "home" {
  return event instanceof CustomEvent && event.detail === "home" ? "home" : "back";
}

/** The agent says it is ready, as eliza's does: its client asks before each request. */
const health: Route = (request, url) => (request.method === "GET" && url.pathname === "/api/health" ? Response.json({ ready: true }) : undefined);

/** The resident agent and the cloud over `world`: each area adds its routes here. @throws {never} */
export function services(world: Scene) {
  return {
    agent: answering([health, ...sampleRoutes(world.sample), ...askRoutes(world.ask)]),
    cloud: answering([]),
  };
}
