# apps/app/src/browser/device-preferences.ts
- Lines: 41 | Role: validated cache + edit API over the browser device-preferences document (alpha.browser.device.v1) | Verdict: SIMPLIFY
- Importers: 11 (alert-audio, audio-settings, device, location, notifications, sensor-policy, prototype/inbox-cloud-adapter, prototype/settings-adapter, runtime/connection-ui, runtime/development-cartesia-conversation, runtime/google-agent-access). Text/path pins: test/agent-action-preferences.test.mjs (readFileSync source text, T1), test/calendar-connect-policy.test.mjs (reads source), test/google-agent-access.test.mjs, specs/quint/refinement/application/google-access-publication.mjs, specs/quint/application/manifest.json, test/browser/device-storage-migration.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | A1 | `if(receipt.format!=='domain'\|\|receipt.legacyChanged)throw` — depends on the legacy envelope fields of DomainRecovery. | Delete the `legacyChanged`/`format` checks when domain-document.ts loses the envelope. | Coordinated with domain-document.ts. |
| 2 | 32 | B3 | `edit` validates before and after the caller's edit: `Object.assign(state,validate(state));...;validate(state)` — re-validating values written by typed in-process callers. | Validate once on read (storage boundary); drop the post-edit validate. | Low; callers are typed (device.ts, settings-adapter). |
| 3 | 6-13 | B3 (P7) | Hand-written validator with 3 loops and a 400-char preAirplane expression. | Keep the read-time validation (stored data) but express as a small schema table; delete preAirplane key-set check (only device.ts writes it). | Low. |
| 4 | 14, 35-36 | B4 | `installed` flag guards double installation of window listeners. | Keep (multiple constructors call it); acceptable. | - |
| 5 | 36 | B1 | `refreshDevicePreferences().catch(()=>{})` swallow. | Keep with comment: status() exposes the error via `error`. | - |
| 6 | 5 | A7 | `export type DevicePreferences` has 0 importers outside this file (git grep -w). | Drop `export`. | None. |
| 7 | 26 | A7 | `refreshDevicePreferences` exported, only used in-file and by test/browser/device-storage-migration.spec.ts (page.evaluate). | Keep while that spec exists; otherwise unexport. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| initialDevicePreferences | helper | 4 | none | stay |
| validate | helper | 6-13 | none | stay |

## Proposed end state
No legacy receipt checks; single validation on read; DevicePreferences unexported. Cache/refresh/initialize remain. Estimated lines after: 34 (current 41).

## Verification
test/browser/device-storage-migration.spec.ts, test/agent-action-preferences.test.mjs + test/calendar-connect-policy.test.mjs (source-text; delete per T1), google-access-publication Quint harness.
