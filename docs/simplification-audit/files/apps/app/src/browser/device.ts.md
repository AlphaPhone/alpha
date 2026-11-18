# apps/app/src/browser/device.ts
- Lines: 102 | Role: web AlphaDevice/ElizaSystem plugin: device facts, network/sensor toggles, roles (mocks), settings dialog, launcher | Verdict: SIMPLIFY
- Importers: 2 (browser/register.ts, browser/device-adapter.ts). Text/path pins: specs/quint/application/manifest.json, scripts/storage-specs.ts; many spec names contain "browser/device" only via other files (false positives checked); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-31 | A7 | `export async function browserDeviceFacts` has no importer outside this file (git grep -w: 0 in apps/test/specs). | Unexport. | None. |
| 2 | 26-27 | B2 | `typeof getBattery==='function'` capability probe — legitimate (Battery API is not universal). | Keep. | - |
| 3 | 34, 63, 74, 89 | A4/D5 | `devSurfacesEnabled?...:...` copy forks (P8) in a product plugin. | Inject dev copy through the dev registry; keep product strings only. | Low; user-visible strings in product unchanged. |
| 4 | 38 | B3 | `validateRoles` validates a document only test-mocks code writes. | Keep only while roles are simulated; move roles methods (getStatus/requestRole, 58-59) into the dev module since both throw `rolesUnavailable` in product. | Low. |
| 5 | 42, 52, 56, 87 | C3 | `window.dispatchEvent(new Event('alpha:device-settings'));window.dispatchEvent(new Event('focus'))` repeated 4×, while editDevicePreferences→refreshDevicePreferences already dispatches both when the value changes (device-preferences.ts:17). | Delete the explicit dispatches after edits. | Medium: refresh only fires `changed()` when values differ; verify dev-controls specs. |
| 6 | 72-93 | D8/C4 (P4) | `openSettings` 21 lines, one 1,853-char line (87) building a test-mocks settings dialog with hand-rolled lifecycle and inline styles. | Split: product path (75-80) stays; test-mocks dialog (81-92) moves to dev/ and uses the dialog kit. | Medium; dev-calendar-preferences and remaining-dialog-layout specs cover it. |
| 7 | 96-101 | D4 | `listLauncherApps→list`, `launchApp→launch`, `getBuildInfo→buildInfo` aliases. `buildInfo` is not called on AlphaDevice by any app code (git grep `\.buildInfo`: 0 in apps). | Implement `listLauncherApps/launchApp/getBuildInfo` directly; delete `buildInfo`. Keep `list/launch` only if AlphaDevice callers exist (none found by grep). | Medium: confirm no AlphaDevice.list/launch callers in .eliza/client-features before deleting. |
| 8 | 65 | B1 | `readDevicePreferences().catch(()=>null)` intentional fallback. | Keep with comment. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| BrowserBattery | type | 17 | none | stay |
| validateRoles | helper | 38 | none | dev module |
| appVersion | const | 14 | none | stay |

## Proposed end state
Product plugin: facts, brightness/network/sensor/text-scale, product openSettings branch, launcher methods without aliases. Roles + test-mocks settings dialog move to dev/. Redundant event dispatches removed. Estimated lines after: 70 (current 102).

## Verification
test/browser/dev-calendar-preferences.spec.ts, remaining-dialog-layout.spec.ts, home-launcher.spec.ts, device-storage-migration.spec.ts, accessibility-sweep.production.spec.ts (ElizaSystem method list).
