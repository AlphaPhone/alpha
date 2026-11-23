# scripts/aggregate-voice-latency.ts
- Lines: 175 | Kind: script (manual acceptance analysis CLI for voice latency, issue #395) | Verdict: KEEP, SIMPLIFY
- Covers: aggregates exported renderer voice-timing records and native audio-clock exports into cold/warm p50/p95 cohorts and exits 0/2/3 against the six-second budget. Duplicates: route list (39) is a copy of `apps/app/src/runtime/voice-timing.ts:43` and `diagnostics-export.ts:31` `VOICE_ROUTES`; `android-cloud-voice-timing.ts:15` has a fourth copy. Callers/importers: `scripts/native-voice-latency-emulator.ts:25` (`aggregate`, `nativeTable`); no npm/workflow caller; doc references in `diagnostics-export.ts:120,123`, `voice-timing.ts:6`; tests `diagnostics-export.test.mjs`, `native-voice-latency.test.mjs`, `voice-entry-timing.test.mjs`, `voice-timing.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39 | C6 / D5 | Route set duplicated from the product and still lists `paired-agent` and `development-agent`, which D5 deletes from the product. | Import the route list from `voice-timing.ts` (export it) so both shrink together. | Low |
| 2 | 24-28, 32, 46, 72 | A1 | Accepts "older exports" without `entry` and calls "legacy exports" readable. Exports are files a tester produces, not app data, but the format starts fresh with the renamed package. | Drop the optional-`entry` branch and the `unspecified` cohort once the product always writes `entry`. | Low |
| 3 | 53-65 | C3 | Hand-written argv parser. | `node:util parseArgs` with numeric post-checks. | None |
| 4 | 16-22, 150-152 | — | "Legacy renderer stage sums" are reported but can never satisfy acceptance (`legacyDiagnosticsSufficient`). | Keep as diagnostics; rename to `rendererDiagnostics` (no "legacy" naming for a current format). | None |
| 5 | 35 | D13 | Type import through `../.eliza/client-features/packages/voice/...`. | Use the `@eliza/*` alias when it lands. | None |
| 6 | 162-175 | — | CLI body is fine (exit codes carry the verdict). | Keep. | — |

## Tests
Four host tests import its pure functions (T3). Keep one integration test that runs the CLI on two fixture exports (renderer + native) and checks exit code and cohort numbers; delete the rest.

## Proposed end state
~150 lines, `parseArgs`, routes imported from the product, no legacy-export branch. Owner question: is this still the tool for #395 acceptance runs (no CI caller)? If not, delete it together with `native-voice-latency-emulator.ts` and their tests.
