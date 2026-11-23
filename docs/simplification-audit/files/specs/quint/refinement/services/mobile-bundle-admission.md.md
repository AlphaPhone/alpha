# specs/quint/refinement/services/mobile-bundle-admission.md
- Lines: 15 | Kind: formal model documentation | Verdict: MERGE into the header comment of `mobile-bundle-admission.mjs`, then delete
- Covers: what `MobileBundleAdmission.qnt` models (candidate vs. written receipt, stale readback) and what the replay executes. Duplicates: harness `assumptions` (`.mjs:386-391`), manifest `specs/quint/services/manifest.json:2204+`. Callers/importers: none (no reference outside itself).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | C5 | Same content as the receipt assumptions and manifest abstractions. | Keep 4 lines as the harness header. | none |
| 2 | 11-15 | T9 | Run instructions reference `test/mobile-uuid-build.test.mjs` alongside the replay; that test's last case is a source-text test (T1) and its receipt cases duplicate this replay (see harness report). | Drop. | none |
| 3 | 5 | B5 | "all 23 reviewed UUID package files" — a count that changes with the policy. | Drop the number. | none |

## Proposed end state
No `.md`; a short header comment in the harness.
