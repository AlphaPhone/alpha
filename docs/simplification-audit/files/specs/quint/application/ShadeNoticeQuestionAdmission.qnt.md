# specs/quint/application/ShadeNoticeQuestionAdmission.qnt
- Lines: 76 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) of dev-only code | Verdict: KEEP (conditional, D19/D20) / PORT harness
- Covers: Own-notice questions asked from the simulated development shade: an approved dialog hands off its lease; shade re-entry, hide, lock or a successor retire the pending read. Duplicates: OwnNoticeQuestion (application) models `reviewOwnNoticeQuestion` itself. Callers/importers: `shade-notice-question-admission.mjs` (aggregate) <- `test/shade-notice-question.test.mjs` (37 lines) + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D6 | Models the simulated shade only: `main.tsx:139` installs `installNotificationsAdapter` only when `systemShade==='simulated'` (browser/dev build). | D19/D20: keep model and code together while a retained e2e spec drives the simulated shade; delete both together otherwise. | M |
| 2 | 7,11,56 | B4 | `staleEffect` is initialised false and never assigned by any action, so `RetiredReadHasNoEffect` is vacuous. | Set `staleEffect` in `finish` when a retired id would compose/report, or delete the variable and invariant (the `id != s.owner` branch already encodes it). | L |
| 3 | harness | T2/T10 | `test/fixtures/shade-notice-question.mjs:23-28` slices `context-selection.ts` (`const OPAQUE = ` .. newline), `notifications-adapter.ts` (`const opaque` .. `type Notice =`, and from `export function installNotificationsAdapter`), inlines `browser/content-question.ts`, strips types and runs in `vm`. | PORT to esbuild-bundled `installNotificationsAdapter` with a stub plugin, if kept. | M |

## Proposed end state
- Kept only while the dev simulated shade is kept (owner question in chunk summary).
- Vacuous variable fixed; harness bundles the real adapter.
