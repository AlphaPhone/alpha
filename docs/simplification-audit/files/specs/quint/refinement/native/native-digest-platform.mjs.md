# specs/quint/refinement/native/native-digest-platform.mjs
- Lines: 98 | Kind: refinement platform builder (Android stubs + slice of product `HostedDelivery.java`) | Verdict: PORT
- Covers: Writes stand-ins (Context, ContextCompat permission, SelectedCalendarReader, AlphaCredentialStore, AlphaReminders, HostedInbox, a fake `HostedDelivery` shell) and pastes the real `nativeSource` admission block into that shell. Duplicates: none. Callers/importers: only `native/native-digest.mjs:7`.

Product text read: `android/app/src/main/java/ai/alphacompute/alphaphone/HostedDelivery.java`, sliced from `' interface NativeSourceWork'` to `' private JSONObject active()'`, with the assertion that the slice contains `'t.verify();'`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-18, 73-88 | T10 | The admission code under test is cut out of `HostedDelivery` and re-hosted in a hand-written class whose `active()`, `check()`, `openTransport()` and `store` replace the real ones. Reordering `HostedDelivery`, or deleting its remote/cloud/local modes (cross-file-actions Q-HOST-1/C4), breaks the anchors. | Move `NativeSourceWork` + `nativeSource(...)` into its own package-private class (e.g. `NativeDigestAdmission`, or into `NativeDigestHost`) that takes the delivery as a small interface (`active`, `check`, `openTransport`, `gate`, `store`). Compile it whole; delete the slice. | Medium |
| 2 | 20-36 | C5 | Android `Context`, `ContentResolver`, `PackageManager`, `ContextCompat` stubs repeated across platforms. | Shared stub library. | Low |
| 3 | 12-13, 90-97 | C5 | Temp-dir/write/close boilerplate identical in every `*-platform.mjs`. | One `writeStubs(files)` helper. | None |

## Proposed end state
~40 lines of stub declarations (or none, if the shared stub set already has them). No reads of product source text;
the harness compiles `NativeDigestHost`, `NativeDigestSources` and the extracted admission class whole.
