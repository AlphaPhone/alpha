# specs/quint/refinement/services/SignInTestPorts.java
- Lines: 226 | Kind: formal harness fixture (Java external ports: in-memory credential slots, blocking checkpoints, HTTPS `URLStreamHandlerFactory` that serves Cloud/Steward routes) | Verdict: KEEP
- Covers: the controlled boundary for `SignInCoordinatorTraces.java`: every HTTP route the native sign-in coordinator may call, with per-scenario failures (ack 503 rounds, code caps, MFA, revoke DELETE) and a checkpoint per request so the driver can interleave cancellation. Duplicates: the dev-side twin of the same Cloud routes lives in `scripts/browser-cloud-dev-bridge.ts` tests (different language and layer; not mergeable). Importers: `SignInCoordinatorTraces.java`, `sign-in-coordinator.mjs` (compiled into the campaign), `sign-in-platform.mjs` (stub storage calls `SignInTestPorts.values`/`checkpoint`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 84 | D8 | A 250-character authority condition. | Split into `isApi(url)` / `isAssetLinks(url)`. | None |
| 2 | 123-148, 182-185 | D10 | Route behaviour keyed on scenario-name string tests (`scenario.endsWith("code-cap")`, `scenario.equals("retry") && index == 2`). | Acceptable in a fixture; could become a per-scenario config record set by the driver. | Low |
| 3 | 42, 50 | T8 | 20 s waits per boundary (see the driver report). | 5 s. | Low |
| 4 | 15-28 | — | Public static mutable state; correct only because each scenario runs in a fresh JVM. Document that dependency if the driver moves to one JVM. | Add `reset()` if scenarios share a JVM. | Low |

## Proposed end state
Same ports, split authority check, optional per-scenario config object; stays next to its only driver.
