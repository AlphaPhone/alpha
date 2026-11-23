# apps/app/src/browser/preference-recovery.ts
- Lines: 11 | Role: six one-line openDomainRecovery wrappers for preference documents | Verdict: MERGE into a recovery table
- Importers: 5 (device-controls.tsx, device.ts, prototype/browser-adapter, prototype/camera-adapter, prototype/settings-adapter). Text/path pins: specs/quint/application/manifest.json; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-11 | D4 | Six thin wrappers; production renders only "Data kept" for all of them (domain-recovery.ts:9). | `openRecovery('bookmarks')` keyed table beside the documents. | Low; 5 importers change. |
| 2 | 6, 10, 11 | A1 | Copy "The older copy remains available for backup" refers to the legacy envelope. | Drop sentence with A1. | Test-mocks-only copy. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted; table entries in preference-documents.ts or a recoveries.ts. Estimated lines after: 0 (current 11).

## Verification
device-controls specs, settings-adapter recovery paths.
