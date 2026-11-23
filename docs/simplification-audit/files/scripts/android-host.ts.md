# scripts/android-host.ts
- Lines: 117 | Kind: script (generates the Android Gradle host from `android/consumer-host.json` with the upstream generator) | Verdict: KEEP
- Covers: reads the authored host descriptor and `app.config.json`, stages patched native sources and the owner-route asset, and calls upstream `generateAndroidConsumerHost`. Duplicates: none. Callers/importers: npm `android:host`; `build-android.ts:301`, `build-archive.ts`, `build-notification-fixture.ts`, `ci/build-private-peer.py`, `generate-licenses.ts`, `gradle-verification.ts`, `test-native-calendar-consumer.ts` (delete candidate); `.gitignore`, `android/consumer-host.json`; listed in `quint-lib.ts`, `source-snapshot.ts`; tests `android-host.test.mjs`, `fixtures/android-browser-module-stage.mjs`, `gradle-verification.test.mjs`, `owner-merge-review.test.mjs`, `product-identity.test.mjs`, `verify-apks.test.mjs`; `specs/quint/services/manifest.json:2737`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-35 | B3 | Validates schema numbers of our own committed descriptor. | Keep (one line, gives a clear message when upstream bumps the schema) or delete; low value either way. | None |
| 2 | 41, 62 | C3 | `app.config.json` read twice (identity and orientation). | One `readAppConfig(root)`. | None |
| 3 | 1-14, 31-108 | D8 | One-space indentation. | Formatter pass. | None |

## Proposed end state
Unchanged in shape; moves to `scripts/build/` in the structural pass. Behaviour is covered by every Android build (generator output is compiled) and `gradle-verification`.
