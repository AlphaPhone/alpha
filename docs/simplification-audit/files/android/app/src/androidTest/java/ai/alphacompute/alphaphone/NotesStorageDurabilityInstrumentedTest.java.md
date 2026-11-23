# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesStorageDurabilityInstrumentedTest.java
- Lines: 172 | Role: encrypted slot caps / storage-full refusal on the real store, the lowered Trash cap with its retained 32 MiB allowance, renderer `storage-full` code, the full-collection UI and the encrypted draft surviving a failed commit | Verdict: SIMPLIFY
- Importers: none. Uses `AlphaCredentialStore` (`slotLimit`, `retainedLimit`, `NOTES_*`, `StorageFullException`), upstream `ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots`, `NotesSecureFixture`, `NotesCapacityFixture`.
  Text/path pins: `scripts/android-instrumentation.ts:190` (`NotesStorageDurability: { args: { notesStorage: "1" } }` → runner test text-matches `"1".equals(InstrumentationRegistry.getArguments().getString("notesStorage")`); comments naming the class in `test/browser/notes-trash-full.spec.ts:4` and `test/fixtures/secure-store-memory/MemoryTest.java:64` (comment only).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-69 | A1 | `loweredTrashCapKeepsOlderOversizeTrashReadableAndShrinkable` exists only for `AlphaCredentialStore.retainedLimit` ("A document written under the old 32 MiB cap stays readable"), writing through a hand-built `JsonCredentialSlots(..., name->32*1024*1024)` "earlier host" (l.52). Research android P5 lists `retainedLimit` as a legacy reader for data the renamed package cannot hold. | With the A1 decision delete lines 39-69 together with `AlphaCredentialStore.retainedLimit` (`AlphaCredentialStore.java:43,59-70`) and its callers in `specs/quint/refinement/native/CredentialCoordinatorTraces.java:197`, `specs/quint/refinement/services/ServiceCredentialTraces.java:27` (switch them to `slotLimit`). | Medium: Quint refinement harnesses reference `retainedLimit`. |
| 2 | 18-37 | T3 | `storageFullIsADistinctRefusalThatWritesNothing` drives `AlphaCredentialStore` directly (no UI); ungated, so it runs on every `--classes NotesStorageDurability`. It is the only device check of UTF-8 byte counting at the cap. | Keep (only coverage of a risky boundary); fold l.21-23 cap assertions into the slot-constants class once P6 lands (they re-assert constants). | Low. |
| 3 | 21-23, 48-50, 104 | B5 / C6 | Exact-number assertions on caps (`256*1024`, `32*1024*1024`, `30*1024*1024`) duplicate `AlphaCredentialStore.slotLimit`'s regex ladder. | Assert behaviour at `slotLimit(slot)` only; drop literal re-statements. | Low. |
| 4 | 71-81 | C3 / P20 | `js`, `until(code,what)`, `click`, `input`, `openNotes`, `slot`, `cas` — same set as `NotesSecureStorageInstrumentedTest.java:15-25`; `slot()` (l.77) assigns to `r` then returns it. | Move `cas`→`NotesSecureFixture.compareExchange`, `slot`→`NotesSecureFixture.call(secureRead)`; WebView helpers → `WebViewTestDriver`. | None. |
| 5 | 13-16 | KEEP | `jsonOfBytes` comment explains a real heap constraint. | Keep. | — |
| 6 | 125, 130 | B1 (acceptable) | Cleanup suppresses secondary failures onto the primary; specified behaviour for disposable fixtures. | Keep; extract a shared `Cleanup.run(primary, action)` if T-wide helper is introduced (same block in NotesSecureStorage:41-43, NotesTrashBackstop, PhotosBatch:65, PhotosLibrary:49). | — |
| 7 | 114-115 | A8 | Comment narrates history: "The old 33 MiB textarea forced enormous WebView text layout before…". | Rewrite to say why the edit is small. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `unique` | helper | 12 | `UUID.randomUUID().toString()` inline everywhere | inline |
| `jsonOfBytes` | helper | 16 | none | keep |
| `js`/`until`/`click`/`input` | helper | 71-75 | NotesSecureStorage:15-25 and ~60 files | `WebViewTestDriver` |
| `openNotes` | helper | 76 | NotesSecureStorage (inline ×4), NoteAudio* tests | `AppNavigation.open("Notes")` |
| `slot` / `cas` | helper | 77-81 | NotesSecureStorage:18,59,67-69 | `NotesSecureFixture.read(slot)` / `compareExchange` |

## Proposed end state
Four tests remain: storage-full on the store (without literal cap re-assertions), renderer `storage-full` code,
full-collection UI, and the draft surviving a failed commit. The lowered-Trash-cap legacy test is deleted with
`retainedLimit`. Helpers move to `WebViewTestDriver` / `NotesSecureFixture`. Estimated 172 → ~125 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes NotesStorageDurability`; host
`node --test test/android-instrumentation-runner.test.mjs`; `test/browser/notes-trash-full.spec.ts`; Quint native
refinement lane if `retainedLimit` is removed.
