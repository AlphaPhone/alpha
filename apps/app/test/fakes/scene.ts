// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { type CameraScene, cameraScene } from "./camera.ts";
import { type AskScene, askRoutes, askScene } from "./ask.ts";
import { type CalendarScene, calendarRoutes, calendarScene } from "./calendar.ts";
import { type MapsScene, mapsRoutes, mapsScene } from "./maps.ts";
import { cloudRoutes } from "./cloud.ts";
import { type InboxScene, inboxRoutes, inboxScene } from "./inbox.ts";
import { type PlatformScene, platformRoutes, platformScene } from "./platform.ts";
import { type Route, answering } from "./routes.ts";
import { type SampleScene, sampleRoutes, sampleScene } from "./sample.ts";
import { type LauncherScene, launcherScene } from "./launcher.ts";
import { type SettingsScene, settingsScene } from "./settings.ts";
import { type FilesScene, filesScene } from "./files.ts";
import { type PhotosScene, photosScene } from "./photos.ts";
import { type TelephonyScene, telephonyRoutes, telephonyScene } from "./telephony.ts";
import { type UpdateScene, updateScene } from "./update.ts";
import { type VoiceScene, voiceScene } from "./voice.ts";

export interface Scene {
  phone: boolean;
  image: boolean;
  now: number;
  signedIn: boolean;
  readonly secrets: Map<string, string>;
  readonly slots: Set<string>;
  readonly sample: SampleScene;
  readonly ask: AskScene;
  readonly launcher: LauncherScene;
  readonly settings: SettingsScene;
  readonly inbox: InboxScene;
  readonly calendar: CalendarScene;
  readonly camera: CameraScene;
  readonly files: FilesScene;
  readonly photos: PhotosScene;
  readonly maps: MapsScene;
  readonly telephony: TelephonyScene;
  readonly platform: PlatformScene;
  readonly update: UpdateScene;
  readonly voice: VoiceScene;
}

export function scene(): Scene {
  return {
    phone: false, image: false, now: 0, signedIn: true, secrets: new Map(), slots: new Set(),
    sample: sampleScene(),
    ask: askScene(),
    launcher: launcherScene(),
    settings: settingsScene(),
    inbox: inboxScene(),
    calendar: calendarScene(),
    camera: cameraScene(),
    files: filesScene(),
    photos: photosScene(),
    maps: mapsScene(),
    telephony: telephonyScene(),
    platform: platformScene(),
    update: updateScene(),
    voice: voiceScene(),
  };
}

const health: Route = (request, url) => (request.method === "GET" && url.pathname === "/api/health" ? Response.json({ ready: true }) : undefined);

/** @throws {never} */
export function services(world: Scene) {
  return {
    agent: answering([
      health,
      ...sampleRoutes(world.sample),
      ...askRoutes(world.ask),
      ...calendarRoutes(world.calendar),
      ...platformRoutes(world.platform),
      ...telephonyRoutes(world.telephony),
    ]),
    cloud: answering([
      ...cloudRoutes(),
      ...inboxRoutes(world.inbox),
      ...mapsRoutes(world.maps, () => world.now),
    ]),
  };
}
