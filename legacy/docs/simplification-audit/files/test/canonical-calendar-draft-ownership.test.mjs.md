# test/canonical-calendar-draft-ownership.test.mjs
- Lines: 107 | Kind: bundled-module harness (esbuild bundle of the real `canonical-calendar-drafts.ts` + codec + upstream `durable-draft.ts`, four imports replaced by inline port stubs via `test/fixtures/canonical-calendar-draft-owner.mjs`) | Verdict: DELETE (T4)
- Covers: a Calendar editor draft stays bound to the account that wrote it across rebinding, delayed reads/writes, stale discard callbacks and misbound rows. Duplicates: `test/quint-canonical-calendar-draft.test.mjs` (drives the same fixture through `specs/quint/refinement/application/canonical-calendar-draft.mjs`) and again in `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-10 | T4 | Uses the exact fixture the live Quint refinement harness drives; the six scenarios are owner-fence cases the model's traces already explore. | Delete this file; keep the fixture (the harness imports it). | Low: the six hand-picked schedules are not guaranteed to be among the replayed traces; confirm the model's `bind/holdRead/holdWrite` actions cover "delayed read after rebind" before deleting. |
| 2 | 78-89 | A1/A3 | "neither resumed nor exported" exercises `openDomainRecovery` (the test-mocks-only "old copy" recovery dialog). That path is in the C6 deletion set. | Drops with the deletion. | None |
| 3 | 5 | - | Top-level `await buildCalendarDraftFixture()` runs an esbuild bundle at import; noticeable but small (~100 ms). | - | - |

## Proposed end state
File deleted. `test/fixtures/canonical-calendar-draft-owner.mjs` survives only as the driver of the Quint refinement
harness (move it under `specs/quint/refinement/application/` once no host test imports it). If one end-to-end case
is wanted, `journeys/calendar.spec.ts` gets "draft typed under account A is not shown after switching to B and is
offered again on return to A".
