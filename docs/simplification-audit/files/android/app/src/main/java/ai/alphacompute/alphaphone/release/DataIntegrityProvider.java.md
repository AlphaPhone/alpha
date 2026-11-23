# android/app/src/main/java/ai/alphacompute/alphaphone/release/DataIntegrityProvider.java
- Lines: 92 | Role: DUMP-protected, read-only ContentProvider (own `:integrity` process) that lists every app-data file as (domain, HMAC(path), HMAC(bytes)) under a caller nonce, for `scripts/pilot-update.ts` before/after comparisons of release installs. | Verdict: KEEP (small SIMPLIFY)
- Importers: no Java importer; registered in `android/app/src/main/AndroidManifest.xml:103` (`.release.DataIntegrityProvider`, authority `${applicationId}.integrity`). Consumer: `scripts/pilot-update.ts:85-99` (`INTEGRITY_AUTHORITY`, `integrityQuery`) with the row parser upstream in `vendor/eliza/packages/os/scripts/android/apk-release-record.mjs` (`parseIntegrityExport`).
  Text/path pins: `test/pilot-update-export.test.mjs:54-70` (reads the source and regexes `HmacSHA256`, `List\.of\("cache", "code_cache"\)`, `public (?:Uri|int) insert\([^)]*\)\{throw new UnsupportedOperationException` for insert/delete/update, absence of `BuildConfig.DEBUG|ELIZA_DEV_ALLOW_TEST_MOCKS|isDebuggable`, and that no `testMocks/java/.../release` dir exists); `test/support/feature-parity.mjs:175` (path); `scripts/apk.ts:101` (exported-component allowlist by FQCN → `android.permission.DUMP`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 86 | C3 | Own hex encoder `hex(byte[])` with `Character.forDigit((b>>4)&15, 16)`; identical loop in `GoogleWorkspaceReturnFlow.java:35`, other hex variants in `AlphaDevicePlugin.java:240` (BigInteger), `WorkflowWorkerAssets.java:26-27` (`String.format`). | Use the shared Java `Digests.hex` util proposed for P9 (android research §4); delete the local copy. | Low |
| 2 | 72-75 | B4 | `if(Files.isSymbolicLink(child.toPath()))continue;` is redundant: both following checks pass `LinkOption.NOFOLLOW_LINKS`, so a link is neither a directory nor a regular file and is already skipped. | Delete line 73; keep the comment on the NOFOLLOW checks. | Low (behaviour identical; no test pins the line) |
| 3 | 36, 52 | D7 | `static final String[] COLUMNS` and `static MatrixCursor export(...)` are package-private; grep for `DataIntegrityProvider.(PATH|END|COLUMNS|export)` finds 0 callers anywhere (no javac host test compiles this class). `PATH`/`END` are `public` with no Java reader. | Make `COLUMNS`, `export` private; `PATH`/`END` private. Add one comment that `domains`, `#end`, `path:`/`count:` prefixes are the wire format parsed by upstream `parseIntegrityExport`. | Low |
| 4 | 79-86 | D8 | Three helpers packed one per line (`mac`, `hmac`, `hex`) with several statements each. | Formatter pass. Note: the formatter must keep `){throw new UnsupportedOperationException` on lines 89-91 unspaced or update `test/pilot-update-export.test.mjs:65` (that regex is a T1 source-text assertion; delete it with T1). | Low |
| 5 | 47-48 | B1 (keep) | `catch(IOException|GeneralSecurityException failure){throw new IllegalStateException("Integrity export failed: "+failure.getClass().getSimpleName());}` drops the message. This is the specified behaviour (the export must never leak a file name or path), so keep; add "message omitted: may contain a path" to the catch. | Comment only. | None |
| 6 | 23-32 | — | Javadoc is accurate and current (no tombstones). | None. | — |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `hex(byte[])` | helper | 86 | `GoogleWorkspaceReturnFlow.java:35` (same forDigit loop), `AlphaDevicePlugin.java:240`, `WorkflowWorkerAssets.java:26-27`, `HostedResultNotices.java:31`, `CalendarSyncSnapshot.java:140`, `AlphaCredentialStore.java:159` | `ai.alphacompute.alphaphone.util.Digests.hex` |
| `mac(nonce)` / `hmac` / `digest(file)` | helper | 79-85 | No other HMAC user in `android/` (grep `HmacSHA256`: this file only). Streaming file digest resembles bounded-read copies (P9) but is unbounded by design. | Keep local |
| `NONCE` | const (regex) | 37 | Nonce validation also in `scripts/pilot-update.ts` via upstream `integrityQuery` (`test/pilot-update-export.test.mjs:15`) — two languages, same rule `[0-9a-f]{32,128}`. | Keep (trust boundary on each side) |
| `SKIPPED` | const | 39 | — | Keep |
| `PATH`, `END`, `COLUMNS` | const | 34-36 | Wire format mirrored in upstream `parseIntegrityExport` (JS) | Keep, make private |

## Proposed end state
Same class, ~88 lines after formatting expands the three packed helpers and the local `hex` is replaced by the shared util:
delete the redundant symlink check (line 73), make `PATH/END/COLUMNS/export` private, add a one-line comment naming the
upstream parser of the row format. No behaviour or wire change. Keep in `release/` (it is a release component, not test-mocks).

## Verification
- `node --test test/pilot-update-export.test.mjs` (source regexes + `scripts/pilot-update.ts` parsing).
- `scripts/apk.ts` distribution check via `npm run verify` / `verify-apks` (exported provider permission).
- Device: `scripts/pilot-update.ts` integrity readback on a release install (only real execution of this class; no instrumentation test exists).
