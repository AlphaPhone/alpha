# test/embedding-host-admission.test.mjs
- Lines: 207 | Kind: tooling integration (real `verifyEmbeddingHost`/`verifyEmbeddingInputs` from `scripts/stage-embedding-host.ts`, `run`/`stagedLibraries` from `build-embedding-host.ts`, contract helpers from `embedding-native-contract.ts`; temp repos borrowing `vendor/eliza` objects via alternates, sparse checkout at the pin) + one transplant (lines 200-207) | Verdict: KEEP, MERGE the embedding-* family into `test/tooling/embedding-host.test.mjs`
- Covers: the APK only packages embedding-host bytes that match the committed qualification (`android/embedding-host/qualified-host.json`), bound to the exact native and producer inputs at the pin, the same arm64 engine as the voice host, and the pinned BGE-384 model; unpackaged builds admit absence but never a partial payload. Duplicates: `embedding-native-contract.test.mjs` case 3 repeats a receipt-admission check on a synthetic repo. Callers/importers: `npm test`. Release gate (Gradle calls `stage-embedding-host.ts --verify`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 84-198 | - | Each refusal is a real supply-chain rule of a release input. Keep. | Keep. | - |
| 2 | 135-143 | T8 | Loops over every qualified input x 2 producer modes, each building a fresh sparse-checkout fixture and a commit: the dominant cost of the file (tens of git operations per row). | One representative input per kind (CMake, C++, Java, producer helper) instead of all. | Low. |
| 3 | 200-207 | T2 | Regex-extracts the `const manifest={pin:receipt.pin...}` literal from `stage-embedding-host.ts` and evaluates it with `new Function`. | Export a `receiptManifest(receipt,...)` function and call it, or delete (case 5 already proves the record is preserved). | Low. |
| 4 | 12, 20 | C3 | Local `git` and `sha` helpers (copies across the family). | Shared `test/fixtures/embedding-host.mjs` with the fixture builder. | None. |
| 5 | 34-83 | D8 | 50-line fixture builder with 300-character lines. | Move to the shared fixture, split into `pinnedVendor()`/`shallowVendor()`. | None. |
| 6 | 181 | A1? | Variable named `legacy` for a record without `producerInputs`: the rule "new admissions need producer closure" is current, not legacy. | Rename `withoutProducerInputs`. | None. |

## Proposed end state
`test/tooling/embedding-host.test.mjs` holding the admission cases (trimmed input loop), the preparation refusals, the
library mapping cases and the JNI contract cases, on one `test/fixtures/embedding-host.mjs`. Runs only when
`scripts/*embedding*`, `android/embedding-host/**`, `android/voice-host/**` or `upstream.lock.json` change.
