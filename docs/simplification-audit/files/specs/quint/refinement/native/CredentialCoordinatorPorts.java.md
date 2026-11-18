# specs/quint/refinement/native/CredentialCoordinatorPorts.java
- Lines: 154 | Kind: Quint harness support (Java port/stub surface for storage, HTTPS, service stop) | Verdict: KEEP (support file of a live, import-style harness)
- Covers: no behaviour itself; supplies controlled storage writes (`failBefore/After/ReadSlot`), strict-stop dispatch, resident boot/request/stream ports and an `https` URL handler that answers only `PRODUCTION_API_HOST/api/v1/user`. Duplicates: `DeletionTestPorts.java`, `ResidentTestPorts.java`, the `ClockReviewSupport` stub in `clock-review-platform.mjs` and Gmail's `ClosedConnection` each re-implement "static mutable port + event log + fault flags" (C5 across harnesses).
- Callers/importers: `CredentialCoordinatorTraces.java`, `CredentialResidentTraces.java` (Java); `credential-coordinator.mjs` (compiles it); `credential-coordinator-platform.mjs` (string-patches the shared resident stubs `Plugin.notifyListeners`, `ElizaAgentService` strict-stop/request/stream bodies to call into this class, lines 141-182).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 51-68 | C3 | `dispatchStrictStop` and `strictStop` repeat the same four statements. | One private `recordStop()`. | None |
| 2 | 125-153 | C5 | Hand-written `HttpURLConnection` fixture; Gmail and Google-return harnesses each have their own. | When harness support is consolidated, one `FixtureHttps` helper in `refinement/native/` with a route→response map. | Low |
| 3 | platform 175-182 | T10 (fixture-side) | The ports are wired in by `.replace()` on *fixture* text produced by `resident-platform.mjs` (not product text). Fragile but self-contained. | Make the resident stub `ElizaAgentService` delegate to an interface the harness sets, instead of string replacement. | Low |
| 4 | 116-124 | B1 | `InterruptedException` rethrown as `IllegalStateException`; fine in a harness. | None | None |

## Proposed end state
Kept as the port surface for the credential campaigns, with the duplicated stop body folded and, when harness
support is consolidated, the HTTPS fixture and event log shared with `DeletionTestPorts`/`ResidentTestPorts`.
