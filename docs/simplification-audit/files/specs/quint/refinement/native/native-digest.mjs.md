# specs/quint/refinement/native/native-digest.mjs
- Lines: 49 | Kind: Quint refinement driver (host JVM, 18 scenarios) | Verdict: KEEP; drop in-harness pin assertions
- Covers: Native digest consent: grant/revoke/expiry, scope refusal, storage failure around commit, exact owner, projection and size bounds, reminders-only / calendar-only, held describe re-checking the grant after a blocking port, retired transport. Model `NativeDigestConsent` (`specs/quint/native/manifest.json:3028`). Duplicates: none. Callers/importers: `native/index.mjs:64`, `test/quint-native-digest-consent.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-32 | B5 | Asserts no patch targets `NoticeOwner.java` and that its sha equals the upstream pin. Supply-chain ceremony inside a behaviour check. | Delete; `prepare-patched-native` already authenticates sources. | None |
| 2 | 22-27 | B5 | Hashes manifests, scripts and test fixtures as "sources". | Keep compiled files + model only. | None |
| 3 | 8 | C3 | `jsonJar` from `test/fixtures/jvm-tools.mjs` duplicates `java.mjs`. | One JVM-tools module. | Low |
| 4 | 20-48 | — | Real `NativeDigestHost`, `NativeDigestSources`, `HostedResultNotices` and upstream `NoticeOwner` compiled whole. Good shape; the only slice is in the platform file. | Keep. | — |

## Proposed end state
~35 lines once the platform port lands: compile product classes + extracted admission class, run scenarios, `checkTraces`.
