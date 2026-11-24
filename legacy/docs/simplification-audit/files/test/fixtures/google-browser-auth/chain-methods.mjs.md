# test/fixtures/google-browser-auth/chain-methods.mjs
- Lines: 110 | Kind: support (Java source slicer for transplant harnesses) | Verdict: KEEP, MOVE to `specs/quint/refinement/native/cloud-sign-in-methods.mjs` once the host overlay is gone; long-term PORT upstream
- Covers: cuts 15 exact method bodies out of upstream `CloudSignInPlugin.java` (`between(start,end)` on literal comment/signature anchors) and injects them into `/* ACTUAL_* */` markers of a Java harness template, stripping `private`.
- Duplicates: `between` and the inject loop are copies of the helpers inlined in upstream `vendor/eliza/packages/auth/android/test/native-sign-in.test.mjs:24-29,63-70`; the method map is a superset of upstream's inline chain map (adds `ACTUAL_START_CODE`, `ACTUAL_BROWSER_LIFECYCLE`, `ACTUAL_RESUME_ACKS`, `ACTUAL_DESTROY`; upstream has `ACTUAL_ACK_RECOVERY` instead).
- Importers (grep of repo excl. vendor/.eliza/audit): `test/fixtures/google-browser-auth/native-sign-in.test.mjs:16` and `specs/quint/refinement/native/google-browser-return-claim.mjs:7` (live model `GoogleBrowserReturnClaim`, listed in `specs/quint/native/manifest.json`, run by `test/quint-google-browser-return-claim.test.mjs`). Survives the overlay deletion because of the Quint harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-15, 17-106 | T10 / T2 | Every anchor is a literal string from an upstream file (e.g. `" /**\n  * Called once when an explicit attempt"`). Any upstream comment edit or reformat breaks both the host test and the Quint model. | Cannot be ported to an import from this repo: the methods are `private` members of an Android `Plugin` subclass. PORT needs upstream to extract the chain into a plain-JVM class with ports (upstream follow-up, D14). Until then keep. | Low (keep) |
| 2 | 1-110 | C3 / C5 | Second copy of upstream's slicer helpers, kept only so the Alpha fork and the Quint harness share one map. | After the overlay is deleted, move next to its only importer (`specs/quint/refinement/native/`), not under `test/fixtures`. | Low |
| 3 | 108-117 | B3 | `injectMethods` asserts exactly one marker per name; the useful part (fail if an anchor drifts) is already in `between`. Fine to keep; it is the only guard against silent non-injection. | None | - |

## Proposed end state
- Short term: unchanged file, moved to `specs/quint/refinement/native/cloud-sign-in-methods.mjs` with the chain template, owned by the Quint harness.
- Long term (upstream follow-up): upstream exposes the browser/callback/cancel chain as a package-private class driven by ports; the Quint harness compiles the staged upstream sources and calls it; this file is deleted.
