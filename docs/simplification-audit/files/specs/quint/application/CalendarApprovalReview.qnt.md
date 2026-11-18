# specs/quint/application/CalendarApprovalReview.qnt
- Lines: 50 | Kind: Quint model (live, 8 runs) | Verdict: KEEP
- Covers: a typed Calendar approval decision consumes exactly one authenticated, current, unchanged read of the approval queue; a lost reply never re-arms; retired or aborted reads cannot admit a decision. Duplicates: `test/calendar-approval-client.test.mjs` (host unit test of the same 35-line client, T3), `test/calendar-approval-ui.test.mjs`, Playwright `calendar-approval-queue.spec.ts`. Callers/importers: manifest (4 sources); harness `calendar-approval-review.mjs` (88 lines) bundles the real `runtime/calendar-approval-client.ts`; `test/quint-calendar-approval-review.test.mjs` **and** aggregate (index.mjs:1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | — | `sources` list `runtime/calendar-approval.ts`, `prototype/calendar-approval-adapter.ts`, `prototype/calendar-approval-review.ts`, but the harness executes only `calendar-approval-client.ts`. The extra paths only widen CI selection (§2.3). | Narrow `sources` to `calendar-approval-client.ts`. | None |
| 2 | 25-26 | — | `refused(exact)` is a stutter step (`s' = s`) used as a label for refused decisions. | None | — |
| 3 | wrapper | T4 / B5 | Run twice (per-model + aggregate); wrapper asserts `receipt.traces === 29`, `inputsUnchanged`, `driverInputsBound`. Host unit test `calendar-approval-client.test.mjs` covers the same client again. | Per-model only; assert pass and `traces > 0`; delete the host unit test (this replay is the stronger integration check). | None |
| 4 | 1-50 | D8 | Minified style (`s'={...s,…}` without spaces). | Formatter pass (D9). | None |

## Proposed end state
Unchanged semantics; formatted; manifest sources narrowed to the executed client; one wrapper.
