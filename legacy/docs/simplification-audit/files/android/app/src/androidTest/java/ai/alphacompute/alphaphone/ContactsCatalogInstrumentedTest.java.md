# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ContactsCatalogInstrumentedTest.java
- Lines: 45 | Role: upstream `ai.eliza.plugins.contacts.ContactsCatalog` (used by `AlphaTelephonyPlugin.java:43`): literal search URI segment, 1 MiB page budget, owned-profile bounded search and exact edit selection. | Verdict: SIMPLIFY (move pure half upstream)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:175` registry note.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-23 | T5 / T3 | `literalSearchIsOneSegmentAndPageBudgetIsCheckedBeforeAppend` is a pure unit test of the vendored class (`ContactsCatalog.searchUri`, `admitRecordBytes`) | Belongs in `vendor/eliza` plugin-native-contacts tests (upstream PR); delete here once it lands | Low |
| 2 | 24-44 | T5 | `ownedContactsHaveBoundedSearch…` also tests only the upstream class against the real provider; Alpha's integration is `AlphaTelephonyPlugin.searchContacts`, which is AOSP-image-only | Keep until an AOSP-image journey covers contact search through the product plugin; then move upstream | Low |
| 3 | 32-34 | D8 | 3 builder chains of ~300 chars | Formatter | None |

## Local types and helpers
None besides inline fixtures.

## Proposed end state
Pure method moved upstream; provider method kept until an image-level journey exists. Estimated 45 -> ~30 lines (0 if both move upstream).

## Verification
`--classes ContactsCatalog` (owned disposable profile); `node --test test/aosp-image-capability.test.mjs` (pins the plugin's use of `ContactsCatalog`).
