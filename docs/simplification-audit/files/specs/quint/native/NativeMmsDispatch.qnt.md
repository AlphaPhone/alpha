# specs/quint/native/NativeMmsDispatch.qnt
- Lines: 233 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); refinement harness compiles real Alpha Java plus patched upstream classes, with upstream members spliced by text | Verdict: KEEP (harness: SIMPLIFY + partial PORT)
- Covers: Reviewed MMS send: shared SMS/MMS fixed operation ID, binding/tombstone receipts, PDU file custody, outbox rows, carrier callback overriding Android success, interrupted handoff recovery (11 runs, 7 invariants). Duplicates: `NativeSmsDispatch.qnt` models the same journal/tombstone for the SMS binding (binding 3 here) — overlapping but different send paths. Callers/importers: manifest (sources: `AlphaTelephony`, `AlphaTelephonyPlugin`, `AlphaSmsSendReceiver`, `AlphaImageCapability`, launcher manifest, `consumer-host.json`, 7 upstream `plugin-native-messages` classes); `specs/quint/refinement/native/mms-dispatch.mjs` (+`mms-dispatch-platform.mjs`, `sms-dispatch-platform.mjs`, `MmsDispatchTraces.java`); `test/quint-native-mms-dispatch.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `specs/quint/services/manifest.json` mentions it; `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `mms-dispatch.mjs:13,22,34-36` | P6 | `historicalProbe` materialises upstream revision `b1817660…` through `specs/quint/legacy/core/formal-source-inventory.mjs` and `mms-historical-sources.json` only to reproduce two historical counterexamples of code that no longer exists. This is one of the live dependencies that blocks retiring `specs/quint/legacy` (D11). | Delete the historical probe, `mms-historical-sources.json` and its test case; keep the current-source campaign. | Low: the current-source campaign is the refinement evidence |
| 2 | `mms-dispatch-platform.mjs:4-35`, `sms-dispatch-platform.mjs:26-55` | T10 | Upstream `TelephonyPlugin`, `MmsStore`, `SmsProviderReader` are cut by comment/declaration anchors (`// ---- Reviewed native MMS`, ` static final int ADDRESS_FROM`, ` // ---- Notices` …) and spliced into stub classes. Anchors live in `vendor/eliza`, so they only move on a pin bump, but any upstream reformat breaks the harness. | Medium term: compile the whole upstream classes against fuller Android stubs, or ask upstream for a test accessor (D14 follow-up). Not blocking Alpha-side refactors. | Low |
| 3 | test + `index.mjs` | T4 | Campaign runs in the per-model wrapper and again in the native aggregate. | Keep one runner (the manifest-driven `check-quint-refinement`), delete the per-model wrapper or drop the model from the aggregate. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Keep pass/fail; drop mid-run re-hashing and exact counts (assert `> 0`). | None |
| 5 | — | P1 | Sources are Alpha Java + upstream messages plugin; CI should run it only on changes to those files, `upstream.lock.json` or this harness. | Path filter in the formal lane. | None |

## Proposed end state
- Model unchanged; stays live.
- `mms-dispatch.mjs` loses the historical probe and its legacy imports; `mms-historical-sources.json` deleted.
- One runner (manifest-driven), pass/fail only.
- Upstream member splicing stays until an upstream accessor exists (listed as D14 follow-up).
