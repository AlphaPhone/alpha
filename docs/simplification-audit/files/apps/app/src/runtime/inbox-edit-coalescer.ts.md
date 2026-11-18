# apps/app/src/runtime/inbox-edit-coalescer.ts
- Lines: 55 | Role: debounces Inbox unsaved-draft writes (latest value wins, bounded by `maximumWait`, hold/release while a writer is busy); `coalesceDelay` carries a LemmaScript contract. | Verdict: KEEP
- Importers: 1 (`prototype/inbox-unsaved.ts`). Text/path pins: `LemmaScript-files.txt:18`, `specs/lemma/README.md:198`, `specs/quint/services/manifest.json:4113-4147` (9 entries), `specs/quint/refinement/services/inbox-edit-coalescer-replay.mjs:5` (drives it with an injected `timers` port at line 16), `test/inbox-operation-guards.test.mjs:6`, `test/quint-inbox-edit-coalescer.test.mjs`, `test/support/feature-parity.mjs:533`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3, 36-37 | D7 (justified) | `EditCoalescerTimers` "replaceable in tests" — used by the Quint replay harness (`inbox-edit-coalescer-replay.mjs:16-18`), which DECISIONS D11 keeps. | Keep; change the comment to "Timer port; the Quint replay injects a model clock." | — |
| 2 | 4-18 | A7 | `EditCoalescer<T>` interface exported, no external importer (grep src: this file only). | Unexport (keep as return type). | None. |
| 3 | 37 | — | `maximumWait = Math.max(delay, options.maximumWait ?? 1500)` keeps the Lemma precondition `delay <= maximumWait`. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `EditCoalescerTimers` | interface | 2 | `local-agent.ts:735` `clock:{now;sleep}` port for `awaitLocalAgentStopped` | stays |
| `coalesceDelay` | helper (Lemma) | 21-29 | — | stays |

## Proposed end state
Unchanged, ~55 lines; one unexport and a comment fix. Clean, single-purpose, formally specified.

## Verification
LemmaScript (`LemmaScript-files.txt`), Quint `InboxEditCoalescer` + replay, `test/quint-inbox-edit-coalescer.test.mjs`, Inbox unsaved-draft Playwright journeys.
