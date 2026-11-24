# apps/app/src/native.ts
- Lines: 27 | Role: Alpha's typed `ElizaSystem` and `DeviceApps` plugin handles, `isAndroid`, the launcher bridge, `launcherListens` and `openAppInfo` | Verdict: SIMPLIFY (and MOVE into the proposed `native/plugins.ts` with daily.ts, research n–z P7)
- Importers: 10 app (main.tsx:64 takes `isAndroid, DeviceApps, System, launcherBridge, launcherListens, openAppInfo`; runtime/connection-ui.tsx:63 `isAndroid, System`; 8 files take only `isAndroid`: prototype/agent-adapter.ts:78, prototype/maps-adapter.ts:8, runtime/gmail-background.ts:2, google-connection-ui.tsx:4, hosted-background.ts:2, hosted-digest-ui.tsx:20, hosted-live-source-ui.tsx:4, mock-admission.ts:1). specs/quint/refinement/application/drawer-interaction-fixture.tsx:3 (`openAppInfo`), specs/quint/refinement/application/cloud-connection-notices.mjs:205 and test/browser/native-cloud-subscription.spec.ts:48 import `/src/native.ts` in-page; test/browser/browser-voice-registration.spec.ts:5 reads `launcherBridge`.
- Text/path pins: specs/quint/application/manifest.json:2303 (sources of the launcher drawer model); test/support/feature-parity.mjs:334.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D13 / research P18 | `import type { System as UpstreamSystem } from "../../../vendor/eliza/plugins/plugin-native-system/src/index"` — direct `vendor/eliza` import, bypassing the `.eliza/client-features` projection the rest of the app uses; line 4 uses the `@elizaos/capacitor-system/launcher` alias for the same plugin | Import the type through the projection/alias (`@elizaos/capacitor-system` entry or `.eliza/client-features/plugins/plugin-native-system/src/index.ts`) | Low; type-only |
| 2 | 24-26 | C2, B2 | `(System as unknown as { openAppInfo(options: typeof target): Promise<void> }).openAppInfo(target)` — the method is Alpha's (AlphaSystemPlugin.java) but missing from the registered type, so it is reached through a double cast | Add `openAppInfo(target): Promise<void>` to the intersection type at lines 5-8 beside `getNetworkStatus`, then `export const openAppInfo = (target) => System.openAppInfo(target)` (or export `System` and call it at main.tsx:192) | None |
| 3 | 17-23 | B2 | `launcherListens` sniffs `Capacitor.PluginHeaders` for an `addListener` method. Its own comment says "Every Android Plugin declares addListener, so this is true on a phone"; in the browser `PluginHeaders` is absent so `!header` is true. In every shipped configuration the value is `true` | Delete `launcherListens`; pass `follow: true` (or drop the option) at main.tsx:192 | Medium: confirm no test harness injects `PluginHeaders` without `addListener` (grep finds none; the only other reader is main.tsx:192). If the owner wants to keep the defence, move the header lookup into the shared `pluginHasMethod(name, method)` helper (research n–z P8) |
| 4 | 21 | C3 | `(Capacitor as typeof Capacitor & { PluginHeaders?: ... }).PluginHeaders?.find(...)` — one of 9 PluginHeaders casts (runtime/native-connection.ts:14,18,25,217, main.tsx:369) | If kept, use `pluginHasMethod('ElizaSystem','addListener')` from platform-plugins.ts | Low |
| 5 | 14 | C3 | `export const isAndroid = Capacitor.getPlatform() === "android"` is the intended single predicate, yet notes-trash.ts:16, note-audio-deletions.ts:16, reminder-journal-store.ts:10, notes-folders.ts:9, workflow-intents.ts:19,36, startup-permissions.tsx:64 recompute it, and 215 `Capacitor.isNativePlatform()` calls are used interchangeably | Keep this export; migrate the re-derivations to it (cross-file) | Low |
| 6 | 5-8 vs other files | C2 | `ElizaSystem` is registered with ad-hoc partial types in prototype/agent-adapter.ts:84 (`setFlashlight`), prototype/settings-adapter.ts:124 (`getDeviceSettings`, `getStatus`, `requestRole`), runtime/error-boundary.tsx:50 (`getBuildInfo`), browser/device-controls.tsx:47 (`requestRole`); `DeviceApps` is registered again in runtime/error-boundary.tsx:56 (`openHomeChooser`) | Extend the types here (Alpha-only methods in the intersection) and import `System` / `DeviceApps` in those files | Low; types only — `registerPlugin` already shares the proxy |
| 7 | 27 | D8 | `export { System };` separate from its declaration | `export const System = ...` at line 5 | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `System` (ElizaSystem handle) | const | 5-8 | agent-adapter.ts:84, settings-adapter.ts:124, error-boundary.tsx:50, browser/device-controls.tsx:47 | here / `native/plugins.ts` |
| `DeviceApps` | const | 11-13 | error-boundary.tsx:49,56 (`openHomeChooser`); unrelated `DailyApps` in daily.ts | here / `native/plugins.ts` |
| `isAndroid` | const | 14 | notes-trash.ts:16, note-audio-deletions.ts:16, reminder-journal-store.ts:10, notes-folders.ts:9, workflow-intents.ts:19,36, startup-permissions.tsx:64 | here |
| `launcherListens` | const | 20-23 | PluginHeaders lookups in native-connection.ts, main.tsx:369 | delete (or `pluginHasMethod`) |
| `openAppInfo` | helper | 25-26 | none | typed method on `System` |

## Proposed end state
~18 lines: `System` typed with Alpha's extra methods (`getNetworkStatus`, `openAppInfo`, and the ones now typed ad hoc elsewhere), `DeviceApps` with `platformCapabilities` and `openHomeChooser`, `isAndroid`, `launcherBridge`. No vendor import, no PluginHeaders sniffing, no double cast. Eventually lives in `native/plugins.ts` with the other typed plugins.

## Verification
quint application launcher-drawer model (drawer-interaction-fixture.tsx imports `openAppInfo`), test/browser/browser-voice-registration.spec.ts, test/browser/native-cloud-subscription.spec.ts, home launcher specs (test/browser/home-launcher.spec.ts), `npm run verify` and the Android build (Alpha `openAppInfo` is native).
