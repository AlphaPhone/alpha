# apps/app/src/maps/native-location.ts
- Lines: 13 | Role: binds the upstream `NativeMapsLocation` to the `ElizaLocation` Capacitor plugin and adds `locationPermissionGranted()` (no-prompt permission read) | Verdict: SIMPLIFY
- Importers: 3 app (prototype/maps-adapter.ts:26, browser/workflow-location.ts:1, browser/workflow-trigger-runtime.ts:8); maps/state.ts:3.
- Text/path pins: specs/quint/native/manifest.json:625,3683 and symbol pins :3689-3697 (`NativeMapsLocation`, `SharedLocation`, `ElizaLocation` — the import alias `SharedLocation` and the plugin name string are pinned); specs/quint/refinement/native/maps-location.mjs:3,28 bundles this file as entry point; test/support/feature-parity.mjs:324. Stubbed by name in scripts/test-maps-reroute-freshness.ts:54 and specs/quint/refinement/application/map-plane-ownership.mjs:81, maps-event-return.mjs:72 (`locationPermissionGranted`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C2 | `registerPlugin<LocationBridge>('ElizaLocation')` — `ElizaLocation` is registered three times with three types: here (`LocationBridge`), startup-permissions.tsx:22 (`{checkPermissions; requestPermissions}`), browser/workflow-trigger-runtime.ts:53 (`registerPlugin<any>('ElizaLocation').checkPermissions()`) | Export `location` (typed `LocationBridge`) from this file as the one typed handle and import it in startup-permissions.tsx and workflow-trigger-runtime.ts (or put it in the proposed `native/plugins.ts`) | Low: types only; `platform-plugins.registerPlugin` already returns one shared proxy |
| 2 | 7, 11 | C6 | `Capacitor.isPluginAvailable('ElizaLocation')` twice; the instance already exposes `available()` | `const available = () => Capacitor.isPluginAvailable('ElizaLocation');` used by both | None |
| 3 | 12 | B1 | `try { return (await location.checkPermissions()).location === 'granted'; } catch { return false; }` swallows any native failure as "not granted" | Keep (the specified fallback for a read that must never prompt or throw into the Maps screen) but add the one-line reason; or let it throw and handle at maps-adapter.ts:102 | Low |
| 4 | 1, 4 | D13 | two deep relative imports | alias | Low |
| 5 | 3 | B2 | `Capacitor.isNativePlatform()` / `isPluginAvailable` vs `native.ts` `isAndroid` | Leave: upstream contract takes `isNative()`; passing `() => isAndroid` would be equivalent (iOS is not a target) but changes nothing material | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `location` (ElizaLocation handle) | const | 5 | startup-permissions.tsx:22, browser/workflow-trigger-runtime.ts:53 | export from here (or `native/plugins.ts`) |
| `NativeMapsLocation` | class | 6-8 | upstream base | stays |
| `locationPermissionGranted` | helper | 10-13 | startup-permissions.tsx permission reads of the same plugin | stays; startup-permissions may reuse it |

## Proposed end state
~11 lines: exported typed `elizaLocation` handle, shared `available` predicate, the subclass, and `locationPermissionGranted` with a comment on why it never throws. Keep the `SharedLocation` import alias (pinned).

## Verification
quint native maps-location refinement (bundles this file); test/browser/dev-location.spec.ts, location-settings-recovery.spec.ts, dev-workflow-triggers.spec.ts; startup permission browser specs if startup-permissions.tsx switches to the shared handle; `npm run verify`.
