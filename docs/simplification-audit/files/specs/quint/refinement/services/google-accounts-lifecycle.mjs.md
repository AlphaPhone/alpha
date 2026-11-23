# specs/quint/refinement/services/google-accounts-lifecycle.mjs
- Lines: 100 | Kind: Quint refinement harness (esbuild-bundles real `google-accounts.ts`, `google-workspace-return.ts`, `google-connection-return.ts`) | Verdict: KEEP (merge target); add a per-model test
- Covers: account facade disconnect with four readback outcomes, native Workspace return drain (normal/stale/queued), browser foreground return arming and retirement, native return offer nonce scoping, and Calendar-aware disconnect with bounded optional cleanup (`disconnectGoogleWithCalendar` → `agent-calendar.ts`, the live path, not the D4 client stack). Duplicates: `google-accounts.mjs` (to merge). Callers: `services/index.mjs` only; **no** `test/quint-google-accounts*.test.mjs` (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / P1 | Only executor is the services aggregate. | Add `test/quint-google-accounts.test.mjs` before the aggregate is removed. | Medium (coverage loss otherwise) |
| 2 | 15-23 | C5 | `sources` + `capture` closure re-implements what `support.mjs sourceModule(path, stubs, beforeImport)` already supports, copied from `google-accounts.mjs`. | Keep one copy here; drop the hash re-assertion with the receipt cleanup. | Low |
| 3 | 59-73, 74-83 | D8 | Dense one-line statements (`focus();trace.steps.push(...)`). | Reformat with the Prettier pass. | Low |
| 4 | 84-97 | — | Calendar disconnect scenarios exercise the live agent-calendar review shape; keep after D4 since `disconnectGoogleWithCalendar` stays. | Re-check after stage A1 that `LifeOpsLinkedCalendarControl` (contracts import) is still the type in use. | Low |

## Proposed end state
One GoogleAccounts harness (this file plus the connect/return trace from `google-accounts.mjs`), run by its own per-model test.
