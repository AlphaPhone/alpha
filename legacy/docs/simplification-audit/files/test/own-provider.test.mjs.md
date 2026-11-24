# test/own-provider.test.mjs
- Lines: 25 | Kind: host-JVM tests of upstream (compiles `vendor/eliza` Java `NativeProviderAdmission`, `NativeProviderSlot`, `NativeRuntimeEmbeddings`, `CartesiaSpeech`, `CredentialIntentFence`, `CredentialRequestFence` with `test/own-provider/*.java`) + config read (lines 21-25 parse `android/consumer-host.json`) | Verdict: DELETE (upstream follow-up); move the consumer-host check into `scripts/verify-apks.ts`
- Covers: Own keys reuse the native provider slot and isolate voice credentials; Cartesia transport aborts without alternate providers; native request leases recover capacity; the APK stages the shared `CredentialRequestFence` helper. Duplicates: name clash with `test/browser/own-provider.production.spec.ts` (different layer). Callers/importers: `npm test` glob; `test/own-provider/OwnProviderTest.java`, `OwnSpeechTest.java`, `CredentialRequestFenceTest.java` are used only here (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-19 | T5 | All three JVM cases compile only `vendor/eliza` classes: they test upstream code from this repo. | Delete here; propose the three Java tests upstream (D14, `cross-file-actions.md` §6). | Medium until upstream has them. |
| 2 | 21-25 | T1 | Asserts a path string is in `consumer-host.json`. The release question is whether the built APK contains the class. | Move to `verify-apks` (assert the class is in the dex of both variants). | Low |
| 3 | 7, 11, 16 | - | All three JVM cases are `jsonJarSkip`-gated except one. | Gone. | - |
| 4 | - | A7 | `test/own-provider/` directory becomes orphaned. | Delete the three Java files with this test. | None |

## Proposed end state
Deleted with `test/own-provider/`. The three Java tests are offered upstream; the staging requirement becomes an APK-content check in `scripts/verify-apks.ts`. Own-provider behaviour in the product stays covered by `own-provider-host.test.mjs` and `journeys/connection-cloud.spec.ts`.
