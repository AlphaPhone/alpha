// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
import { type CameraScene, cameraScene } from "./camera.ts";
import { type AskScene, askRoutes, askScene } from "./ask.ts";
import { type CalendarScene, calendarRoutes, calendarScene } from "./calendar.ts";
import { type ClockScene, clockRoutes, clockScene } from "./clock.ts";
import { type MapsScene, mapsRoutes, mapsScene } from "./maps.ts";
import { type NotesScene, notesRoutes, notesScene } from "./notes.ts";
import { type CheckoutScene, type RedemptionScene, cloudRoutes } from "./cloud.ts";
import { type InboxScene, inboxRoutes, inboxScene } from "./inbox.ts";
import { type PlatformScene, platformRoutes, platformScene } from "./platform.ts";
import { type RemindersScene, remindersRoutes, remindersScene } from "./reminders.ts";
import { type Route, answering } from "./routes.ts";
import { type WorkflowsScene, workflowRoutes, workflowsScene } from "./workflows.ts";
import { type SampleScene, sampleRoutes, sampleScene } from "./sample.ts";
import { type LauncherScene, launcherScene } from "./launcher.ts";
import { type SettingsScene, settingsScene } from "./settings.ts";
import { type FilesScene, filesScene } from "./files.ts";
import { type PhotosScene, photosScene } from "./photos.ts";
import type { MailLeaseScene } from "./phone.ts";
import { type TelephonyScene, telephonyRoutes, telephonyScene } from "./telephony.ts";
import { textReviewRoute } from "./text-review.ts";
import { type UpdateScene, updateRoutes, updateScene } from "./update.ts";
import { type VoiceScene, voiceScene } from "./voice.ts";
import { type BrowserScene, browserScene } from "./browser.ts";
import { type WalletScene, walletRoutes, walletScene } from "./wallet.ts";

export interface Scene {
  phone: boolean;
  image: boolean;
  now: number;
  signedIn: boolean;
  checkout?: CheckoutScene;
  redemption?: RedemptionScene;
  /** The phone's device lease for mail and calendar: a phone signed in before mail leases existed holds none. */
  readonly mailLease: MailLeaseScene;
  residentAvailable: boolean;
  readonly secrets: Map<string, string>;
  readonly slots: Set<string>;
  readonly sample: SampleScene;
  readonly ask: AskScene;
  readonly launcher: LauncherScene;
  readonly settings: SettingsScene;
  readonly inbox: InboxScene;
  readonly calendar: CalendarScene;
  readonly clock: ClockScene;
  readonly reminders: RemindersScene;
  readonly camera: CameraScene;
  readonly files: FilesScene;
  readonly photos: PhotosScene;
  readonly maps: MapsScene;
  readonly notes: NotesScene;
  readonly workflows: WorkflowsScene;
  readonly telephony: TelephonyScene;
  readonly platform: PlatformScene;
  readonly update: UpdateScene;
  readonly voice: VoiceScene;
  readonly browser: BrowserScene;
  readonly wallet: WalletScene;
}

export function scene(): Scene {
  return {
    phone: false, image: false, now: 0, signedIn: true, residentAvailable: true, secrets: new Map(), slots: new Set(),
    mailLease: { held: true, answer: "SignsIn", asked: 0, heldBack: 0 },
    sample: sampleScene(),
    ask: askScene(),
    launcher: launcherScene(),
    settings: settingsScene(),
    inbox: inboxScene(),
    calendar: calendarScene(),
    clock: clockScene(),
    reminders: remindersScene(),
    camera: cameraScene(),
    files: filesScene(),
    photos: photosScene(),
    maps: mapsScene(),
    notes: notesScene(),
    workflows: workflowsScene(),
    telephony: telephonyScene(),
    platform: platformScene(),
    update: updateScene(),
    voice: voiceScene(),
    browser: browserScene(),
    wallet: walletScene(),
  };
}

const health: Route = (request, url) => (request.method === "GET" && url.pathname === "/api/health" ? Response.json({ ready: true }) : undefined);

/** @throws {never} */
export function services(world: Scene) {
  const review = world.telephony.textReview;
  return {
    agent: answering([
      () => world.residentAvailable ? undefined : new Response(null, { status: 503 }),
      ...updateRoutes(world.update, () => world.now),
      health,
      ...sampleRoutes(world.sample),
      ...askRoutes(world.ask),
      ...calendarRoutes(world.calendar),
      ...clockRoutes(world.clock, () => world.now),
      ...workflowRoutes(world.workflows),
      ...remindersRoutes(world.reminders, () => world.now),
      ...(review === undefined ? [] : [textReviewRoute(review, world.notes.ownerIdentity)]),
      ...notesRoutes(world.notes),
      ...platformRoutes(world.platform),
      ...telephonyRoutes(world.telephony),
      ...walletRoutes(world.wallet, () => world.now),
    ]),
    cloud: answering([
      ...cloudRoutes(() => world.signedIn, () => world.now, world.checkout, world.redemption),
      ...inboxRoutes(world.inbox),
      ...mapsRoutes(world.maps, () => world.now),
    ]),
  };
}
