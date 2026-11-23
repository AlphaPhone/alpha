# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoteOriginInstrumentedTest.java
- Lines: 81 | Role: storage-level check of the reminder-from-note link slot `note-origins:v1:device`: exact write via CAS, stale CAS refused, survives recreation, restored afterwards. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:239`; `test/android-instrumentation-runner.test.mjs:640-641` regex-matches this source for `"note-origins:v1:device"` (T1). Production constant: `AlphaCredentialStore.NOTE_ORIGINS` (`AlphaCredentialStore.java:20`); renderer writer `apps/app/src/prototype/note-origin-adapter.ts`, `apps/app/src/runtime/note-origin.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-23 | A8 | Javadoc: "The slot must be admitted for compare-and-exchange by AlphaConnectionPlugin (the WP1 allowlist fix); until then the write step fails." The slot is admitted now (`AlphaCredentialStore.java:20`, `RendererCredentialSlots.java:29`). Stale. | Delete the sentence (and "(WP1 allowlist)" in the L48 message). | None |
| 2 | 31-39 | C3 | Private `call` copy. | `WebViewTestDriver.call`. | Low |
| 3 | 51-54 | C3 | SHA-256 hex copy (uses default-locale `String.format`). | `TestDigests.sha256Hex`. | None |
| 4 | 29 | C6 | `SLOT` literal duplicates `AlphaCredentialStore.NOTE_ORIGINS` (androidTest is in the same package). | Use `AlphaCredentialStore.NOTE_ORIGINS`; update the runner test regex at `test/android-instrumentation-runner.test.mjs:641` or delete that T1 assertion. | Low |
| 5 | 59 | C3 | Inline poll loop for Home selection. | Shared `until`. | None |
| 6 | whole | T4 | Same CAS-create/stale/recreate/restore shape as the Inbox secure-slot tests; the slot differs. | Could become one parameterised "renderer secure slot CAS" test over the admitted slot list; keep separate if the merge is not done. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call/read/exchange` | helper | 31-50 | Inbox secure-slot tests, `NotesSecureFixture.read/replaceRecords` | `SecureSlotDriver` (read/exchange) |
| `hex` | helper | 51-54 | 30 copies | `TestDigests` |

## Proposed end state
Same test on shared `SecureSlotDriver`/`TestDigests`, stale Javadoc removed. About 55 lines.

## Verification
`npm run test:android:instrumentation -- --classes NoteOrigin`; `node --test test/android-instrumentation-runner.test.mjs`.
