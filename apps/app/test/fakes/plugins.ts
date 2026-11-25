import { elizaCalendar } from "./calendar.ts";
import { elizaCamera } from "./camera.ts";
import { elizaFiles, selectedDocuments } from "./files.ts";
import { alphaMapsTransport, elizaLocation } from "./maps.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore } from "./phone.ts";
import { alphaPhotos } from "./photos.ts";
import { alphaConnection } from "./platform.ts";
import { elizaReminders } from "./reminders.ts";
import type { Answering } from "./routes.ts";
import type { Scene } from "./scene.ts";
import { alphaAgentConsent, alphaCarrierSetup, elizaNotices, elizaReset, elizaSystem, elizaWiFi, settingsHost } from "./settings.ts";
import { telephonyPlugins } from "./telephony.ts";
import { alphaDevice } from "./update.ts";
import { alphaBrowser } from "./browser.ts";
import { alphaVoiceCloud, elizaCloudSpeech, elizaSignIn } from "./voice.ts";

/**
 * The plugins the fake phone's host registers, by the names their `@CapacitorPlugin` gives: one line per plugin, and
 * its import. Lines are only ever added, and git keeps every branch's (`.gitattributes`). An Alpha image's host
 * registers eliza's telephony plugin, and its contacts plugin where the image grants contacts.
 */
export function plugins(world: Scene, services: { readonly agent: Answering; readonly cloud: Answering }): Record<string, Faked> {
  return {
    ElizaAgent: elizaAgent(services.agent),
    ElizaCloud: elizaCloud(services.cloud, () => world.signedIn),
    ElizaSecureStore: elizaSecureStore(world.secrets, world.slots),
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
    ...(world.image ? telephonyPlugins(world.telephony) : {}),
    AlphaDevice: (emit) => ({ ...alphaDevice(world.update, () => world.now)(emit), ...settingsHost(world.settings), ...alphaAgentConsent(world.settings) }),
    ElizaNotifications: elizaNotices(world.settings),
    ...(world.image ? telephonyPlugins(world.telephony, () => world.now) : {}),
    AlphaDevice: (emit) => ({ ...alphaDevice(world.update, () => world.now)(emit), ...settingsHost(world.settings), ...alphaAgentConsent(world.settings) }),
    ElizaNotifications: elizaNotices(world.settings),
    AlphaDevice: (emit) => ({ ...alphaDevice(world.update, () => world.now)(emit), ...settingsHost(world.settings), ...alphaAgentConsent(world.settings) }),
    ElizaNotifications: elizaNotices(world.settings),
    ...(world.image ? { ElizaTelephony: present, ElizaContacts: present, ...telephonyPlugins(world.telephony, () => world.now) } : {}),
    AlphaConnection: alphaConnection(world.platform),
    ...(world.voice.onDevice ? { AlphaVoiceCloud: alphaVoiceCloud(world.voice) } : {}),
    ElizaCloudSpeech: elizaCloudSpeech(world.voice),
    ElizaSignIn: elizaSignIn(world.voice, () => world.signedIn),
    AlphaBrowser: alphaBrowser(world.browser),
  };
}
