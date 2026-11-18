# specs/quint/refinement/native/gmail-background.mjs
- Lines: 79 | Kind: Quint refinement driver (whole app Gmail classes + staged patched upstream mail classes, 31 scenarios in one compiled campaign) | Verdict: KEEP (delete the source-text asserts)
- Covers: Gmail background delivery: WorkManager scheduling (15-min UPDATE, KEEP catch-up, backoff), history continuation/retry/403-409 budget, owner withdrawal, credential rotation, tap consume/release; model `NativeGmailBackground` (native manifest, live). Duplicates: `test/quint-gmail-agent-mailbox-recovery.test.mjs` covers the agent side; host Gmail tests (see their reports). Callers/importers: `test/quint-native-gmail-background.test.mjs` and the native aggregate `index.mjs:63,198` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-46 | T1 | Regex assertions over `node_modules/@capacitor/android/.../Bridge.java` and `BridgeActivity.java` text (`HandlerThread("CapacitorPlugins")`, `taskHandler.post(currentThreadTask)`, `onDestroy … bridge.onDestroy()`) — checks a dependency's source text, not behaviour. | Delete; state the assumption once in the model's manifest entry. | None |
| 2 | 47-50 | T1 | `deepEqual` on the `eliza-notifications` entry of `android/consumer-host.json` — a config-text check. | Delete (the Android build is the proof that the module is wired). | None |
| 3 | 51-61 | B5 | Re-verifies the staged patch receipt and that hashes of upstream files equal the pinned inventory — the same check `scripts/prepare-patched-native.ts`/`upstream-native-source.ts` already perform when staging. | Delete; trust the staging step. | Low |
| 4 | 9, 12 | C3 | Imports `jsonJar` from `test/fixtures/jvm-tools.mjs` while `java.mjs` has its own jar lookup. | One helper (see `java.mjs`). | None |
| 5 | — | T4 | Run by its test and by the aggregate. | Aggregate goes. | None |
| 6 | 64-73 | B5 | Seven assumption paragraphs. | With the receipt decision. | None |
| 7 | 62 | — | Good: one `javaTraceCampaign` compile for 31 scenarios; network refused by `URL.setURLStreamHandlerFactory` in the Java harness. | Keep. | — |

## Proposed end state
Stage, compile, run the 31 scenarios, check traces in batches of 8. About 30 lines; no reading of Capacitor or config text.
