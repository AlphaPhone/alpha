# specs/lemma/apps/app/src/browser/notifications.dfy
- Lines: 268 | Kind: LemmaScript proof companion = generated text + hand-written lemmas | Verdict: KEEP
- Covers: notification tap routing by id/source prefix and the dismissed-marks list bound (keeps live marks, drops oldest gone marks first) (Dafny: 24 obligations, run of 2026-11-10). Duplicates: none (companion `.dfy.gen` is its generated prefix); example-based host tests: `test/browser-notification-clear.test.mjs` references these functions (example-based; overlapping). Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/browser/notifications.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `noticeRoute`, `retainDismissed` + hand-written `RetainSpec` and 19 helper functions/lemmas (`Subseq`, `DropGone*`, `Retain*`) are called from `noticeRoute` used in `notifications.ts` and one other renderer file; `retainDismissed` at `notifications.ts:72` (`BrowserNotifications.mark`); module imported by `browser/register.ts:12` (live).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/browser/notifications.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | — | — | Largest hand-written proof in the chunk (~200 lines of lemmas). Renaming `retainDismissed` or changing its signature requires editing every lemma; keep the function where it is in Stage F. | Pin in Stage F plan: do not rename/move without `lemma:regen` + lemma edits. | med |
| 3 | — | T4 | `test/browser-notification-clear.test.mjs` example cases for `retainDismissed`/`noticeRoute` are subsumed by the proof. | Drop the pure-function cases when that test is reviewed; keep any DOM/integration cases. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/browser/notifications.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
