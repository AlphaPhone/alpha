# apps/app/src/runtime/gmail-mailbox.ts
- Lines: 59 | Role: re-exports upstream mailbox failure/read-state helpers, the Gmail-accounts-changed event, and a LemmaScript-verified "newest rows within byte budget" helper. | Verdict: SIMPLIFY
- Importers: 3 product (`prototype/inbox-cloud-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/google-accounts.ts`). Text/path pins: `LemmaScript-files.txt:16`, `specs/lemma/apps/app/src/runtime/gmail-mailbox.dfy(.gen)`, `specs/lemma/README.md`, `specs/quint/services/manifest.json`, `specs/quint/refinement/services/google-accounts*.mjs`, `scripts/inbox-adapter-fixture.ts`, `scripts/test-gmail-mailbox.ts`, `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-grant-withdrawal.ts`, `scripts/test-inbox-sent-cleanup.ts`, `test/inbox-operation-guards.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-12 | D4 | Re-export block over three upstream files. | Importers take these from upstream directly; keep this file for the Lemma-verified helpers only. | Low |
| 2 | 8, 12 | A7 | `GmailFailure` (0 references), `setGmailReadState` (0 product; `scripts/test-gmail-mailbox.ts` only). | Drop from the re-export. | None |
| 3 | 15 | C6/D3 | `GMAIL_ACCOUNTS_CHANGED='alpha:gmail-accounts-changed'` is always dispatched together with `GOOGLE_ACCOUNTS_CHANGED` (`settings-adapter.ts:493-494`) and listened to together (`inbox-cloud-adapter.ts:1041,1049`). | Merge into `GOOGLE_ACCOUNTS_CHANGED`; check whether `inboxAccountsChanged` reads the CustomEvent `detail` first. | Low |
| 4 | 17, 33-58 | — | `//@ skip`, `//@ verify` annotations and `sizeFrom` ("Proof vocabulary; the app does not call it") are pinned by LemmaScript. | Keep exactly; renaming or moving requires updating `LemmaScript-files.txt` and regenerating `.dfy`. | — |
| 5 | 21-25 | — | `cachedJsonBytes` exported but only used here and in `test/inbox-operation-guards.test.mjs`. | Un-export if that test goes. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `measured` | const (WeakMap) | 18 | no | stay |
| `cachedJsonBytes`, `newestMailBodies`, `newestWithinBudget`, `sizeFrom` | helper | 21-59 | no | stay (Lemma-pinned) |
| `GMAIL_ACCOUNTS_CHANGED` | const | 15 | `GOOGLE_ACCOUNTS_CHANGED` (`google-accounts.ts:202`) | merged into the Google constant |

## Proposed end state
Only the byte-budget helpers (unchanged text, Lemma annotations intact); importers use upstream for failures/read-state; one accounts-changed event. ~45 lines.

## Verification
`npm run verify` Lemma step (`scripts/check-lemma.ts`, `.github/workflows/lemma-check.yml`), `test/inbox-operation-guards.test.mjs`, `scripts/test-gmail-mailbox.ts`, inbox journeys.
