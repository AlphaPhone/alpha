// spec/app/update/index.md, "Story: Check for updates"; spec/app/update/page.md, "Story: Open Alpha while an update is pending"
import type { Faked } from "./phone.ts";
import { rejection } from "./phone.ts";

/** One release as Alpha's update channel describes it (`alpha-update/v1`). */
export interface ChannelRelease {
  schema: "alpha-update/v1";
  versionCode: number;
  versionName?: string;
  notes?: string;
  variant: string;
  signerSha256: string;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
}

/** Android's activation of a staged update, as `AlphaDevice.updateState` reports it. */
export interface UpdateState {
  pending?: boolean;
  phase?: "preparing" | "paused";
  activationId?: string;
  bridgeId?: string;
  canContinue?: boolean;
  automatic?: boolean;
  outcome?: string;
  resumeEligible?: boolean;
}

/** What the fake phone's own updater holds, and how it behaves; a journey changes it between steps. */
export interface UpdateScene {
  version: number;
  signer: string;
  permission: "starting" | "permission-required" | "supported" | "unsupported";
  /** The channel's manifest and the digest of its bytes; neither while the channel has withdrawn it, and `unreadable` while it cannot be read. */
  manifest?: string;
  digest?: string;
  unreadable: boolean;
  /** What `installUpdate` answers: none for an install Android took. */
  installAnswer?: "offer-unavailable" | "offer-withdrawn" | "offer-response-changed" | "starting" | "permission-required" | "unsupported";
  state: UpdateState;
  /** While set, an install waits for it before Android answers. */
  installHeld?: Promise<void>;
  /** While set, `updateState` cannot be read. */
  stateUnreadable?: boolean;
  readonly checks: number[];
  readonly installs: Array<{ apkUrl: string; sha256: string; sizeBytes: number; versionCode: number; automatic?: boolean; manifestSha256?: string }>;
  readonly answers: Array<{ activationId: string; ready: boolean }>;
  readonly continued: string[];
  readonly opened: string[];
}

export const signer = "a".repeat(64);
export const apk = "b".repeat(64);
export const manifestDigest = "c".repeat(64);

/** The launcher release of version `versionCode`, signed as the fake phone's Alpha is. */
export const release = (versionCode: number, overrides: Partial<ChannelRelease> = {}): ChannelRelease => ({
  schema: "alpha-update/v1", versionCode, versionName: `1.${versionCode}`, variant: "launcher", signerSha256: signer,
  apkUrl: `https://releases.alphacompute.cc/alpha-${versionCode}.apk`, sha256: apk, sizeBytes: 4096, ...overrides,
});

export function updateScene(): UpdateScene {
  return {
    version: 120, signer, permission: "supported", unreadable: false, state: {},
    checks: [], installs: [], answers: [], continued: [], opened: [],
  };
}

/** `AlphaDevicePlugin.java`'s updater methods, the `AlphaDevice` plugin, over the scene; `ready` and `settled` are its events. */
export function alphaDevice(scene: UpdateScene, now: () => number): Faked {
  return (emit) => {
    Object.assign(scene, { tell: (event: "alphaUpdateReady" | "alphaUpdateSettled") => emit(event, {}) });
    return {
      snapshot: () => Promise.resolve({ appVersionCode: scene.version, appSigner: scene.signer, appAutomaticUpdates: scene.permission }),
      checkForUpdate: () => {
        scene.checks.push(now());
        if (scene.unreadable) return Promise.reject(rejection("Update check failed"));
        return Promise.resolve({ ...(scene.manifest === undefined ? {} : { manifest: scene.manifest }), ...(scene.digest === undefined ? {} : { manifestSha256: scene.digest }) });
      },
      installUpdate: (options: UpdateScene["installs"][number]) => {
        scene.installs.push(options);
        return (scene.installHeld ?? Promise.resolve()).then(() => (scene.installAnswer === undefined ? {} : { status: scene.installAnswer }));
      },
      updateState: () => (scene.stateUnreadable === true ? Promise.reject(rejection("Update state unreadable")) : Promise.resolve({ ...scene.state })),
      activateUpdate: (options: { activationId: string; ready: boolean }) => {
        scene.answers.push({ activationId: options.activationId, ready: options.ready });
        return Promise.resolve();
      },
      continueUpdate: (options: { activationId: string }) => {
        scene.continued.push(options.activationId);
        return Promise.resolve();
      },
      openUpdatePermissionSettings: () => {
        scene.opened.push("install-unknown-apps");
        return Promise.resolve({ status: "opened" });
      },
    };
  };
}

/** Android says an update is ready to activate, or has settled, as the plugin's events do. */
export function tell(scene: UpdateScene, event: "alphaUpdateReady" | "alphaUpdateSettled") {
  (scene as UpdateScene & { tell?: (name: string) => void }).tell?.(event);
}
