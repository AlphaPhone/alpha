// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { answering } from "./routes.ts";
import { type SampleScene, sampleRoutes, sampleScene } from "./sample.ts";

/** Everything the fake world holds, one field per area; a journey reads and changes it. */
export interface Scene {
  image: boolean;
  textScale: number;
  readonly secrets: Map<string, string>;
  /** The hardware Back and Home: a journey dispatches `new CustomEvent("press", { detail: "back" })`. */
  readonly buttons: EventTarget;
  readonly sample: SampleScene;
}

export function scene(): Scene {
  return { image: false, textScale: 1, secrets: new Map(), buttons: new EventTarget(), sample: sampleScene() };
}

/** Which button a press dispatched on `Scene.buttons` stands for. @throws {never} */
export function pressed(event: Event): "back" | "home" {
  return event instanceof CustomEvent && event.detail === "home" ? "home" : "back";
}

/** The resident agent and the cloud over `world`: each area adds its routes here. @throws {never} */
export function services(world: Scene) {
  return {
    agent: answering([...sampleRoutes(world.sample)]),
    cloud: answering([]),
  };
}
