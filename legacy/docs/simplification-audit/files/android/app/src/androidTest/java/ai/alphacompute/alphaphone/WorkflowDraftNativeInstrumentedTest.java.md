# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowDraftNativeInstrumentedTest.java
- Lines: 33 | Role: Encrypted workflow-draft slot through `AlphaConnection.secureCompareExchange/secureRead/secureRemove`: create, ciphertext on disk, stale CAS conflict, survives recreation, invalid slot refused, remove. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/android-workflow-native.ts:88` (case `WorkflowDraftNativeInstrumentedTest`, gate `workflowDraftNative`). Text/path pins: that case (class + method `encryptedDraftIsAtomicAndSurvivesRecreation`). Slot prefix `workflow-draft:v1:` and on-disk `connection-credentials/<sha(slot)>[.bak|.new]` are the persisted format — keep.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-16 | C3 | `js`, `ready` (200×100 ms poll) and `call` (`window.__workflowDraftNative`) — line-for-line the same as `WorkflowPhoneNativeInstrumentedTest:22-24` except the global name and plugin probe. | Shared `WebViewTestDriver.until/call`. | Low. |
| 2 | 17 | C3 | Private SHA-256→hex `sha()`; identical in `WorkflowPhoneNativeInstrumentedTest:25`; 35 `MessageDigest.getInstance("SHA-256")` sites across androidTest (research C3: 10× in Java main). | One `TestHashes.sha256Hex(String)` in androidTest (or reuse a main-source helper if one is package-visible, e.g. the credential store's file naming function). | None. |
| 3 | 20, 30 | C3 | Slot-file path knowledge `new File(noBackupFilesDir,"connection-credentials")` + `sha(slot)+suffix` duplicated with `WorkflowPhoneNativeInstrumentedTest:28,38,47`. | `AlphaCredentialStore` package-private `fileFor(slot)` used by both tests. | Low. |
| 4 | 30 | C3 / D8 | Primary-failure/suppressed-cleanup idiom `catch(Exception|AssertionError failure){primary=failure;throw failure;}finally{try{...}catch(...cleanup){if(primary!=null)primary.addSuppressed(cleanup);else throw cleanup;}}` also at `WorkflowPhoneNativeInstrumentedTest:43-47,68,97`. | A tiny `TestCleanup.run(ThrowingRunnable body, ThrowingRunnable cleanup)` helper. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`/`ready`/`call` | helper | 14-16 | `WorkflowPhoneNativeInstrumentedTest:22-24` (+ 10 `call` copies) | `WebViewTestDriver` |
| `sha` | helper | 17 | `WorkflowPhoneNativeInstrumentedTest:25`, 33 more SHA-256 sites | `TestHashes.sha256Hex` |

## Proposed end state
One ~15-line test body using shared `call`, `sha256Hex`, slot-file helper and cleanup wrapper. About 22 lines.

## Verification
`node scripts/android-workflow-native.ts` default `workflow` phase (both variants); `node --test test/native-campaign-evidence.test.mjs`.
