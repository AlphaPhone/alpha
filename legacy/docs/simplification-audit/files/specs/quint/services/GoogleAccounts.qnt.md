# specs/quint/services/GoogleAccounts.qnt
- Lines: 144 | Kind: Quint model, live (services manifest; `sharedSources` upstream `WorkspaceAppReturn*.java`) | Verdict: KEEP
- Covers: Google account connect/return/readback for one captured Cloud session: returns never grant capabilities by themselves, readback sets grants, disconnect is uncertain until readback, owner switch retires attempts and native-return drains, optional Calendar pause cleanup cannot block the privacy revoke (12 runs, 7 invariants). Duplicates: partial overlap with application models `GoogleCalendarDisconnect`/`GoogleCalendarLinkFlow` (Calendar side) and `InboxDelivery` (grant withdrawal); distinct state. Callers/importers: manifest; `refinement/services/google-accounts.mjs` and `google-accounts-lifecycle.mjs` (both use `sourceModule` = esbuild bundle of the real `google-accounts.ts`, `google-workspace-return.ts`, `google-connection-return.ts` with port stubs); aggregate `services/index.mjs` / `test/quint-services-refinement.test.mjs` (asserts it among required models). Also named by `scripts/test-google-accounts.ts` and several host tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-64, 106, 132-142 | D4 check | Calendar fields model `disconnectGoogleWithCalendar` pausing the *agent* Calendar link (`google-accounts.ts:10-47`, `agent-calendar`), which D4 keeps; not the deleted client linked-sync stack. | Keep. If D18 later removes the Android calendar bridge, re-check `calendarMapped`. | Low |
| 2 | 93-99 | — | `step` lists fixed argument tuples rather than `nondet`; fine for this size. | None. | — |
| 3 | harness | T10 (ok), B5 | Harnesses import real modules via `sourceModule` (no text slicing); they bundle twice to prove bytes unchanged (`support.mjs:19-44`). | Drop the double-compile/hash ceremony in `sourceModule` (shared helper, affects all users). | Low |

## Proposed end state
Model unchanged. Both harnesses stay as imports; drop receipt/hash ceremony; path-filter to `apps/app/src/runtime/google-*.ts(x)`, `gmail-*.ts`, the upstream `WorkspaceAppReturn*.java`, model + harnesses.
