# test/cloud-deployment.test.mjs
- Lines: 205 | Kind: tooling integration (`scripts/cloud-deployment.ts` generator/validator/`checkCloudDeployment` over temp trees) + JVM integration (compiles generated `CloudDeployment.java`, real `ConnectionRoutes.java`, staged upstream auth classes and a sliced `registration` block of `AlphaCloudSignInPlugin.java`) + module import (`native-cloud-runtime.ts`, upstream `native-google-cloud-port.ts`) + 3 source-text checks | Verdict: KEEP (move to `test/tooling/cloud-deployment.test.ts`); drop source-text lines; replace the Java slice
- Covers: committed generated authorities equal the generator output; a changed deployment changes native login, origin admission and revocation together; validator refuses credentials/insecure/aliased URLs, overlap and names/tenants the native client cannot register; build admission refuses drift, a namespace change without a recorded migration, and SDK base disagreement; every authority change moves the credential namespace; custom deployment reaches inference config and Google transport. Duplicates: `node scripts/cloud-deployment.ts --check` in `verify` re-checks drift (line 12 overlaps it). Callers/importers: `npm test` glob; the script runs first in `npm run verify`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | T4 | "Committed outputs equal generator output" is exactly `cloud-deployment.ts --check` in `verify`. | Delete. | None |
| 2 | 27-28, 96-99, 142 | T1 | Text checks: `browser-cloud-dev-bridge.ts` includes the start path; upstream `CloudSignInEnvironment.java` tenant regex extracted by regex; three scripts must not contain `https://api.eliza.app`. | Delete 27-28 and 142; replace 96-99 by compiling the shared class and calling its constructor with the admitted tenants (the JVM step already exists). | Low |
| 3 | 41-43 | T10 | Slices `AlphaCloudSignInPlugin.java` between `' static final String PENDING_SLOT'` and `' static String receiptSlot('`. | Move `registration(boolean)` into a small class (`AlphaCloudRegistration.java`) and compile that file whole. | Low |
| 4 | 71 | A1 | "legacy credential reused" check on `storageSlot("cloud:production")` is a namespace rule, not a legacy reader; keep. | - | - |
| 5 | 44 | - | Calls `preparePatchedNative` on the real repo (stages upstream native sources; seconds). | Acceptable for a release-tooling suite. | - |
| 6 | 119-130 | - | Refuses a namespace move that would sign every installed phone out: the most valuable case here. | Keep. | - |

## Proposed end state
A ~170-line release-tooling integration file: validator table, drift/namespace/SDK admission, one JVM run over whole
files, and the inference/Google port case. No text greps of other scripts.
