// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { type AskScene, askRoutes, askScene } from "./ask.ts";
import { cloudRoutes } from "./cloud.ts";
import { type PlatformScene, platformRoutes, platformScene } from "./platform.ts";
import { type Route, answering } from "./routes.ts";
import { type SampleScene, sampleRoutes, sampleScene } from "./sample.ts";

/** Everything the fake world holds, one field per area; a journey reads and changes it. */
export interface Scene {
  /** The page runs on a phone: its world is Capacitor's plugins (phone.ts), and not fetch. */
  phone: boolean;
  /** The phone is an Alpha image, which admits Phone, Messages and Contacts. */
  image: boolean;
  /** The world's time, in milliseconds: it only moves on, also while Alpha is closed. */
  now: number;
  /** The owner is signed in on the phone, whose native code then holds a device key for the cloud. */
  signedIn: boolean;
  /** What the phone's secure store holds, and the slots its host opens to the page. */
  readonly secrets: Map<string, string>;
  readonly slots: Set<string>;
  readonly sample: SampleScene;
  readonly ask: AskScene;
  readonly platform: PlatformScene;
}

/** A fresh world: each area adds its field here, one line each. */
export function scene(): Scene {
  return {
    phone: false, image: false, now: 0, signedIn: true, secrets: new Map(), slots: new Set(),
    sample: sampleScene(),
    ask: askScene(),
    platform: platformScene(),
  };
}

/** The agent says it is ready, as eliza's does: its client asks before each request. */
const health: Route = (request, url) => (request.method === "GET" && url.pathname === "/api/health" ? Response.json({ ready: true }) : undefined);

/** The resident agent and the cloud over `world`: each area adds its routes here, one line each. @throws {never} */
export function services(world: Scene) {
  return {
    agent: answering([
      health,
      ...sampleRoutes(world.sample),
      ...askRoutes(world.ask),
      ...platformRoutes(world.platform),
    ]),
    cloud: answering([
      ...cloudRoutes(),
    ]),
  };
}
