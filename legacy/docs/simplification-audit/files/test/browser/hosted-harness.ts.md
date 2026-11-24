# test/browser/hosted-harness.ts
- Lines: 56 | Kind: Playwright support module (fixture) | Verdict: KEEP, MOVE into the shared harness as `harness/local-agent.ts`
- Covers: starts an in-process Vite dev server with `VITE_LOCAL_AGENT=1`, routes `/__alpha-local-agent` to a scripted agent (auth, agents, device register, workflow hosted sources/loops/results/ack) backed by `scripts/local-agent-dev-storage.ts`, connects through Settings diagnostics, and waits until every offered digest result is acknowledged. Duplicates: `flag-off-android.ts` `harness`/digests fixture covers the same results protocol on the Android-bridge path; `helpers/delivery-fixture.ts` / `helpers/retained-digests.ts` may overlap (not in this chunk). Callers/importers: `dev-hosted-journey.spec.ts`, `journey-f-hosted-result.spec.ts` (both import `startHostedServer`, `hostedFixture`, `hostedDevice`, `hostedPanel`; the latter also `hostedResult`). Survives as long as either importer survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56 | — | `hostedPanel` returns the "Scheduled digests" dialog. Checked: it is still live (`apps/app/src/runtime/hosted-digest-ui.tsx:629`), opened from a digest notification; `dev-hosted-journey.spec.ts:12-28` and `journey-f-hosted-result.spec.ts:36,56` drive it. Only its Home/Workflows entry was retired. | Keep. | — |
| 2 | 14-19 | T8 | Each importing file starts a second Vite dev server (cold module graph, ~700 modules) in `beforeAll`; that is the slow part of these specs. | If the default dev server can be started with `VITE_LOCAL_AGENT=1` for one project (e.g. a `local-agent` project in `playwright.config.ts`), drop the in-process server. | Medium |
| 3 | 26-54 | D5 | Name "hosted" is misleading after D5 (hosted-agent pairing is deleted); this is the resident/local agent's scheduled-digest results protocol. | Rename `local-agent` / `digest-results` when moving. | Low |
| 4 | 3-4 | A8 | Header lists importers by name (goes stale). | Remove the list. | — |

## Proposed end state
`test/browser/harness/local-agent.ts` exporting `startLocalAgentServer`, `digestResult`, `connectLocalAgent(page, {results})`, `openDeviceControls(page, name)` and `digestPanel(page)`, used by the workflows/digests journey. If the digests journey consolidates onto the `flag-off-android` digests fixture, this file can be deleted entirely.
