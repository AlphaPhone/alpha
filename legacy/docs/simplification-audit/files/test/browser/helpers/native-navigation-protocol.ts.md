# test/browser/helpers/native-navigation-protocol.ts
- Lines: 56 | Kind: Playwright init-script fixture (resident agent view-navigation / device-context protocol) | Verdict: **MERGE** into `harness/plugins/agent.ts`
- Covers: strict answers for `/api/views/:id/navigate` (prepare-only), `interact-claim`, `interact-result`, `/api/client-devices/context`, `/api/status`, `/api/cloud/warm`, recording contract violations in `unexpected`. Duplicates: none (shared by both resident fakes). Callers/importers: `flag-off-android.ts`, `helpers/resident-agent-plugin.ts`, `journey-core-loops.production.spec.ts`; source-pinned by 10 Quint harnesses (6 under `specs/quint/legacy`, `refinement/application/{account-sheet,cloud-connection-notices,shell-coordinator}.mjs`, `refinement/composition/index.mjs`); its text is read by `test/flag-off-navigation-protocol.test.mjs` (T5, delete in that chunk).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 30 | D8 | 350-character validation conditions. | Split into named checks when moving. | none |
| 2 | 38-46 | A8 | Comment narrates why two lifecycle routes exist. | Shorten. | none |
| 3 | 1-56 | T10 | Live Quint harnesses pin this file by path; moving it changes their digests. | Move in the same commit as the pin list update. | Low. |

## Proposed end state
Lives inside `harness/plugins/agent.ts` (with `resident-agent-plugin.ts` and `resident-stub.ts`); behaviour unchanged. The
host test that reads its source is deleted.
