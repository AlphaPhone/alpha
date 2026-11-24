# test/fixtures/SourceRenewalNoticesTest.java
- Lines: 47 | Kind: unit (real `SourceRenewalNotices` + `HostedResultNotices.hash`, a single `Fixture` faking store, guard and poster) | Verdict: DELETE (after checking two cases against the replay)
- Covers: source-renewal notice routes are opaque, posted at most once after a durable write, survive transient transport loss, and are fenced by owner/revision/revocation/expiry changes, including inside `settle`; unverifiable sources keep their row; interrupted posts retry. Duplicates: `specs/quint/refinement/native/source-renewal.mjs` + `SourceRenewalTraces.java` replay the source-renewal model against the real class (durable `dispatching` reservation at line 96, `RenewalStale`/`RenewalUnverifiable` at 138-139, `withdrawOtherOwners` at 161, write faults before/after replacement at 54-60, five `settle(` calls). `specs/quint/native/manifest.json` pins it. Callers/importers: only `test/source-renewal-notices.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-45 | T3, T4 | Same class, same ports, fewer interleavings than the trace replay. | Delete with `test/source-renewal-notices.test.mjs`. | Low |
| 2 | 23-26 | — | The four-way "change between tap and settle" loop (owner, revision, revoked, expiry) is the case most worth confirming in the replay. | Check `SourceRenewalTraces` covers settle after each change; add missing ones to the model, not here. | Low-medium |
| 3 | 9-11, 19-44 | D8 | 500-1,000-character lines. | Goes with the file. | — |

## Proposed end state
Deleted. Source-renewal notice behaviour is proven by the Quint replay of the real class.
