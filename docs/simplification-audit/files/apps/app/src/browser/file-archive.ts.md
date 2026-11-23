# apps/app/src/browser/file-archive.ts
- Lines: 1 | Role: one-line re-export of upstream plugin-files file-archive | Verdict: DELETE
- Importers: 1 (prototype/browser-camera.ts). Text/path pins: test/browser-camera-storage.test.mjs, test/browser/files-bulk.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 (P10) | `export * from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/file-archive.ts'`. | Import upstream directly from prototype/browser-camera.ts (via @eliza alias), delete file. | Update the two tests + inventory if they import this path. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted. Estimated lines after: 0 (current 1).

## Verification
test/browser-camera-storage.test.mjs, files-bulk.spec.ts.
