import { alphaAssistantDraft } from "./ask.ts";
import { elizaCalendar } from "./calendar.ts";
import { cameraKeys, elizaCamera } from "./camera.ts";
import { elizaFiles, selectedDocuments } from "./files.ts";
import { alphaInboxAttachments } from "./inbox.ts";
import { alphaMapsTransport, elizaLocation } from "./maps.ts";
import { alphaNotes } from "./notes.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore } from "./phone.ts";
import { alphaPhotos } from "./photos.ts";
import { alphaConnection } from "./platform.ts";
import { elizaReminders } from "./reminders.ts";
import type { Answering } from "./routes.ts";
import type { Scene } from "./scene.ts";
import { alphaAgentConsent, alphaCarrierSetup, elizaNotices, elizaPasswords, elizaReset, elizaSystem, elizaWiFi, settingsHost } from "./settings.ts";
import { telephonyPlugins } from "./telephony.ts";
import { alphaDevice } from "./update.ts";
import { alphaBrowser } from "./browser.ts";
import { alphaVoiceCloud, elizaCloudSpeech, elizaSignIn } from "./voice.ts";
import { alphaHostedDigests } from "./workflows.ts";

/**
 * The plugins the fake phone's host registers, by the names their `@CapacitorPlugin` gives: one line per plugin, and
 * its import. Lines are only ever added, and git keeps every branch's (`.gitattributes`). An Alpha image's host
 * registers eliza's telephony plugin, and its contacts plugin where the image grants contacts.
 */
export function plugins(world: Scene, services: { readonly agent: Answering; readonly cloud: Answering }): Record<string, Faked> {
  return {
    ElizaAgent: elizaAgent(services.agent, world.settings.recovery),
    ElizaCloud: elizaCloud(services.cloud, () => world.signedIn, world.mailLease),
    AlphaAssistantDraft: alphaAssistantDraft(world.ask, () => ({ owner: world.notes.ownerIdentity, agent: world.notes.owner, epoch: 1 })),
    ElizaSecureStore: elizaSecureStore(world.secrets, (key) => world.slots.has(key) || /^notes-(?:draft|folders):[1-9][0-9]*$/.test(key)),
    ElizaCalendar: elizaCalendar(world.calendar),
    ElizaReminders: elizaReminders(world.reminders, () => world.now),
    ElizaCamera: elizaCamera(world.camera),
    ElizaFiles: elizaFiles(world.files),
    AlphaPhotos: alphaPhotos(world.photos),
    SelectedDocuments: selectedDocuments(world.files),
    ElizaLocation: elizaLocation(world.maps, () => world.now),
    ElizaSystem: elizaSystem(world.launcher, world.settings),
    ElizaReset: elizaReset(world.settings),
    ElizaWiFi: elizaWiFi(world.settings),
    AlphaCarrierSetup: alphaCarrierSetup(world.settings),
    AlphaMapsTransport: alphaMapsTransport(world.maps),
    ...(world.image ? telephonyPlugins(world.telephony, () => world.now) : {}),
    AlphaDevice: (emit) => ({ ...alphaDevice(world.update, () => world.now)(emit), ...settingsHost(world.settings), ...alphaAgentConsent(world.settings), ...cameraKeys(world.camera) }),
    ElizaNotifications: elizaNotices(world.settings),
    ElizaPasswords: elizaPasswords(world.settings),
    AlphaConnection: alphaConnection(world.platform),
    ...(world.voice.onDevice ? { AlphaVoiceCloud: alphaVoiceCloud(world.voice) } : {}),
    ElizaCloudSpeech: elizaCloudSpeech(world.voice),
    ElizaSignIn: elizaSignIn(world.voice, () => world.signedIn, world.mailLease),
    AlphaBrowser: alphaBrowser(world.browser),
    AlphaInboxAttachments: alphaInboxAttachments(world.inbox),
    AlphaNotes: alphaNotes(world.notes),
    ...(world.workflows.nativeDigests === undefined ? {} : { AlphaHostedDigestDelivery: alphaHostedDigests(world.workflows.nativeDigests) }),
  };
}
