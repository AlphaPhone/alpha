# apps/app/src/prototype/own-notice-question.ts
- Lines: 18 | Role: opens the shared content-question review for one of Alpha's own notices (mail notice, reminder), rechecks and consumes it before drafting, aborts on Home/blur | Verdict: KEEP (format; optionally MOVE next to `browser/content-question.ts`)
- Importers: `inbox-cloud-adapter.ts:8,97`, `reminder-adapter.ts:2,84`; `scripts/inbox-adapter-fixture.ts:44`.
  Text/path pins: `scripts/test-own-notice-question.ts:10` reads and evaluates the text (T2); `specs/quint/refinement/application/own-notice-question.mjs:27` concatenates `content-question.ts` + this file's text (T10); `specs/quint/application/manifest.json` pins `canceled, composing, consumed, ended, recheck, release, reviewOwnNoticeQuestion`; `specs/quint/refinement/services/inbox-coordinator-ports.mjs`; `test/own-notice-question.test.mjs`; `test/support/feature-parity.mjs:404`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 17 | D9 | `let abort=()=>{};` reassigned after `close` exists; `done` references `abort` before final assignment. Works, but reads as a forward reference. | Declare `close` first via a deferred ref or restructure so `abort` is a `const` defined after `close`. | Low; Quint pins local names `canceled/composing/ended` — keep names. |
| 2 | 10, 12, 15 | B1 | `throw Error()` used as control flow into a catch that reports "This notification changed." / "Couldn’t keep". Specified outcome; acceptable. | Keep; give the thrown errors a reason for readability. | — |
| 3 | 5 | C1 | Long inline options type. | Name it `OwnNoticeQuestionOptions` (exported, used by `scripts/inbox-adapter-fixture.ts:44` via `Parameters<…>`). | None. |
| 4 | 2 | D13 | Deep `.eliza` import. | Alias. | — |
| 5 | whole | D8 | 3 statement-soup lines up to 450 chars. | Format. | Quint/text harnesses tolerant? `scripts/test-own-notice-question.ts` rewrites the text — re-run. |
| 6 | whole | D11 | Tiny file (research §5); it is a thin specialisation of `browser/content-question.ts reviewContentQuestion`. | Optional: move beside `content-question.ts` as `reviewOwnNoticeQuestion`. | Path pins listed above. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| options type (inline) | type | 5 | none | named export |
| `done`, `abort` | helper | 8-9 | `launcher-home`/`blur` abort wiring also in `notifications-adapter.ts:182-198` (dev) | stays |

## Proposed end state
Same behaviour, formatted, named options type, no forward-assigned `let`. Est. ~25 lines after formatting (no logic removed).

## Verification
`scripts/test-own-notice-question.ts`, `node --test test/own-notice-question.test.mjs`, Quint own-notice-question refinement, inbox coordinator replays, feature-parity test.
