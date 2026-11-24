# specs/quint/application/RetainedReminderTapAdmission.qnt
- Lines: 74 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: MERGE into `ReminderTapTokens.qnt`
- Covers: A retained reminder tap is consumed only by the exact detail rendered in the same visit with no chooser, sensitive context, form or background in between. Duplicates: `ReminderTapTokens.qnt` (consume-after-visible, `blocked` gate, newer token not consumed). Callers/importers: `retained-reminder-tap-admission.mjs` (aggregate) <- `test/retained-reminder-tap-admission.test.mjs` (30 lines) + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | - | C5/T4 | Second model of the same custody rule as ReminderTapTokens, on a different harness technique. | Merge the three distinct scenarios into ReminderTapTokens: `chooserCloseRechecksRetainedTokenTest`, `changedVisitRefusesSameDetailTest`, `nativeReplacementKeepsNewTokenTest` (visit counter + named gates replace `blocked`). Delete this file, its manifest entry, harness and wrapper test. | M |
| 2 | harness | T2/T10 | `test/fixtures/retained-reminder-tap.mjs:23-28` slices `reminder-creations.ts` (`export function reminderEvents(` .. `/** Specific, stable reason`), strips types, runs `reminder-adapter.ts` in a `vm` with fake Shell/DailyApps. | Goes away with the merge (ReminderTapTokens uses the bundled adapter). | L |

## Proposed end state
- File deleted after its scenarios move into ReminderTapTokens; `test/fixtures/retained-reminder-tap.mjs` and its harness deleted.
- Manifest `sources` of ReminderTapTokens gain `connection-ui.tsx`/`alpha-client.ts` only if the gates are driven through them.
