# apps/app/src/runtime/hosted-digests.ts
- Lines: 76 | Role: re-exports the upstream digest client (`plugin-workflow/src/client/hosted-digests.ts`) and adds Alpha's retained-brief store for Home plus four small Lemma-verified decision helpers. | Verdict: SIMPLIFY
- Importers: 13 in src (main.tsx, prototype/data-adapter.ts via `latestRetainedDigest`, prototype/home-cards.ts, browser/development-digest-document.ts, browser/digest-delegation-ui.tsx, browser/digest-live-sources.ts, runtime/cloud-delegation-ui.tsx, digest-inbox.ts, hosted-background.ts, hosted-digest-ui.tsx, hosted-live-source-ui.tsx, hosted-notice-question.ts, hosted-result-notices.ts, source-renewal-question.ts, workflow-protocol.ts). Text/path pins: `LemmaScript-files.txt:17`, `specs/lemma/README.md:195`, `specs/quint/application/manifest.json:3055,3108,3131,3154,3241`, `specs/quint/refinement/application/retained-home-brief.mjs:7`, `specs/quint/refinement/services/development-digest-pending.mjs:15`, `scripts/fixtures/hosted-digest-protocol.ts:1`, `scripts/test-digest-cancellation.ts:2`, `scripts/test-local-digest-storage.ts:8`, 8 Playwright specs (`test/browser/home-daily-overview.spec.ts` imports it 8×), `test/digest-*.test.mjs` (5), `test/home-overview-cards.test.mjs:81`, `test/hosted-digest-panel.test.mjs:10`, `test/support/feature-parity.mjs:525`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | B2 | `if (typeof window !== 'undefined') window.dispatchEvent(new Event('alpha:retained-digest'));` — renderer-only module; the guard exists for Node tests. | `window.dispatchEvent(...)` unguarded. | Low once Node imports go (DECISIONS D10). Check `scripts/test-local-digest-storage.ts` still loads via the browser loader. |
| 2 | 41-53 | A1 | `digestPendingDiscardable` documents "a record from an older build has no phase and counts as dispatched"; `digestPhaseDiscardable` exists only to give Lemma a string parameter and is `phase === 'review'`. No writer omits `phase` (hosted-digest-ui.tsx:457,482). | Make `DigestPending.phase` required (see hosted-digest-ui report #5); `digestPendingDiscardable(p) = p.phase === 'review'`. Keep `digestPhaseDiscardable` only if the Lemma spec must stay unchanged; otherwise move the `//@ verify` contract onto `digestPendingDiscardable` and drop the `phase === undefined` ensures. | Medium: `LemmaScript-files.txt` + `specs/lemma` + Quint abstraction text must move together (DECISIONS D11). |
| 3 | 54-57 | D10 / A7 | `digestToggledSpec(spec, enabled)` is `{...spec, enabled}`; one caller (hosted-digest-ui.tsx:550) plus one test. | Inline at the call site; delete export and its test. | Low. |
| 4 | 59 | A7 | `export type DigestCalendarChoice = {id: string}` has no importer in src (grep: only this file); tests/specs use it 2×. | Unexport (keep as the parameter type) or inline `ReadonlyArray<{id:string}>`. | None. |
| 5 | 15 | D4 / D13 | `export * from '../../../../.eliza/client-features/plugins/plugin-workflow/src/client/hosted-digests.ts'` re-exports ~40 upstream names through this path so 13 files import upstream via Alpha. | Keep the re-export (it is the single seam) until the `@eliza/*` alias lands (D13); then importers that only need upstream names import `@eliza/plugin-workflow/client/hosted-digests` directly and this file keeps only Alpha's retained-brief binding. | Low. |
| 6 | 17 | T10 | `//@ skip` LemmaScript annotation marks the module-level store for the Lemma extractor. | Keep while `LemmaScript-files.txt` lists the file. | — |
| 7 | 67-76 | D10 | `digestTapNotice` returns user copy and is Lemma-verified on that exact string (`ensures (\result === 'Sign in to the matching account…')`). Fine as is. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `retained` (`RetainedBriefStore`) | const | 18 | upstream owns the class | stays |
| `digestPendingDiscardable` / `digestPhaseDiscardable` | helper | 43-53 | `local-agent-storage.ts:56-61` `advancesPendingDigest` re-checks `phase===undefined||'review'` | here (single phase rule) |
| `digestToggledSpec` | helper | 55 | — | inline |
| `DigestCalendarChoice` | type | 59 | `hosted-digest-ui.tsx:113` calendar choice inline type `{id;name;account;sourceRevision}` | non-exported |
| (proposed) `DigestPending` | type | — | `hosted-digest-ui.tsx:56` `Pending`, `hosted-live-source-ui.tsx:25` | here |

## Proposed end state
~60 lines: the upstream re-export, the retained-brief store and its four functions (unguarded `window.dispatchEvent`), one exported `DigestPending` type, `digestPendingDiscardable` as a one-line rule over a required `phase`, `digestMissingCalendars` and `digestTapNotice` with their Lemma contracts. `digestToggledSpec` inlined; `DigestCalendarChoice` unexported.

## Verification
`npm run verify` (LemmaScript over `LemmaScript-files.txt`, Quint `RetainedHomeBrief`, `HostedDigest*`); Playwright `home-daily-overview.spec.ts`, `home-attention.spec.ts`, `journey-d-digests.spec.ts`, `digest-summary.spec.ts`; `scripts/test-local-digest-storage.ts`.
