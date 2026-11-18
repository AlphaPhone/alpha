# test/fixtures/shade-notice-question.mjs
- Lines: 137 | Kind: transplant fixture (slices three product files, strips types, evals in a vm with a fake shell and JSDOM) | Verdict: PORT (move into `specs/quint/refinement/application/`, import the real modules)
- Covers: asking a question about a notification row from the shade: the dialog shows the row's excerpt, approve composes once, a stale list result after a newer lease cannot toast or compose, hide/visibility/device-state retire the lease. Duplicates: the notifications-adapter slicing is repeated in `test/fixtures/shade-row-custody.mjs` (same `const opaque` / `type Notice =` / `export function installNotificationsAdapter` markers). Callers/importers: `test/shade-notice-question.test.mjs` (research: DELETE) and the live Quint harness `specs/quint/refinement/application/shade-notice-question-admission.mjs` (model `ShadeNoticeQuestionAdmission.qnt`, listed in `specs/quint/application/manifest.json:1210`, registered in `refinement/application/index.mjs:43`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-28 | T2, T10 | Reads `notifications-adapter.ts`, `context-selection.ts`, `content-question.ts` as text. Markers: `const OPAQUE = `..`\n`, `export const ASKABLE_NOTICE_KINDS`..`export type CaptureSelection`, `const opaque`..`type Notice =`, everything from `export function installNotificationsAdapter`, every `^import ...;` line of content-question.ts removed, `^export ` stripped. Any rename or reformat breaks the live model. | Import `installNotificationsAdapter` from `apps/app/src/prototype/notifications-adapter.ts` and the dialog from `browser/content-question.ts` through an esbuild bundle (or `tsImport`) with the native bridge, Capacitor and `formatTime` passed in. The adapter needs its native port (`native.list`) and the shell class as parameters instead of free globals. | medium: the model must keep passing during the port |
| 2 | 78-80 | T10 | Stub specifiers the vm needs: `Shell`, `window`, `document`, `HTMLElement`, `AbortController`, `queueMicrotask`, `native`, `Capacitor.isNativePlatform`, `sensitiveReadingText`, `formatTime`, `clearInterval`. | These become the port object of the imported module. | low |
| 3 | 11-12 | B5 | `shadeNoticeQuestionSources` lists files (including `package-lock.json`) that the harness hashes as provenance. | Pin files through the manifest only; drop `package-lock.json` from the list. | none |
| 4 | 31-33 | B2 | Patches `showModal` and `scrollIntoView` onto JSDOM. | Keep in the fixture (JSDOM gap), one shared helper with the other dialog fixtures. | none |
| 5 | all | C5 | Same adapter boot as `shade-row-custody.mjs`. | Merge both into one `notifications-adapter-harness.mjs` that boots the real adapter once and exposes row actions and the question dialog. | low |

## Proposed end state
One notifications-adapter harness under `specs/quint/refinement/application/` that imports the real adapter and
dialog with explicit ports, serving both `ShadeNoticeQuestionAdmission` and `ShadeRowCustody`. No text markers. The
host test that used this fixture is deleted; the Quint refinement is its coverage.
