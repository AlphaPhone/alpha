# specs/quint/refinement/native/mms-dispatch.mjs
- Lines: 89 | Kind: Quint refinement driver (host JVM, 20 scenarios, upstream messages plugin + Alpha telephony wrapper) | Verdict: KEEP; delete the historical probe and in-harness source-text checks; PORT with its platform
- Covers: Reviewed MMS send: attachment conflicts, cross-kind (SMS/MMS) receipts, revalidation of the reviewed tuple, carrier/SIM change, PDU custody and cleanup, radio refusal before/after handoff, callback evidence, boot without receipt. Duplicates: none for MMS (SMS has `sms-dispatch.mjs`). Callers/importers: `native/index.mjs:55` (aggregate), `test/quint-native-mms-dispatch.test.mjs` (both exports).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 23, 32, 36-37, 44, 50-51, 74-76 | P6/B5 | `historicalProbe` re-runs the harness on upstream revision `b1817660…` (fetched by `scripts/prepare-quint-history.ts`) to show the two pre-repair counterexamples still fail. It proves the harness detects an old bug, not product behaviour, and depends on `specs/quint/legacy/core/formal-source-inventory.mjs`. | Delete `historicalProbe`, `mmsSourceProbe`, the legacy import and test 2 of `test/quint-native-mms-dispatch.test.mjs`; delete `mms-historical-sources.json`. | Low |
| 2 | 52-60, 69 | B5 | Hashes inputs, checks staged sha against pin twice (56-57 and again 60, identical once staged == pinned), re-hashes after replay. Ephemeral runners cannot change inputs mid-run. | Rely on `prepareNativeFixture`'s own receipt check; drop the rest. | None |
| 3 | 59 | A8 | "now includes the former local MMS repair" narrates history. | Delete comment. | None |
| 4 | 61-65 | T1 | Asserts `android/consumer-host.json` module shape and regex-matches `AndroidManifest.xml` for an unexported `AlphaSmsSendReceiver`. Release rules, not refinement. | Move the exported=false rule to `verify-apks` / manifest audit; drop here. | Low |
| 5 | 9-10, 47 | C3 | Imports `jsonJar` from `test/fixtures/jvm-tools.mjs` while `java.mjs` has its own `jsonJar()`; formal code depends on test fixtures. | One JVM-tools module under `specs/quint/refinement/support/` (or `scripts/lib/`), imported by both. | Low |
| 6 | 45-51 | B5 | 20+ entry `sources` list (scripts, fixtures, manifests) exists for receipt hashing. | Keep only compiled files plus the model. | None |

## Proposed end state
~45 lines: stage native sources, build the shared messages platform, compile product wrapper + whole upstream
classes, run the 20 scenarios, `checkTraces`. No history, no manifest regexes, no hash re-checks.
