# C-android-16: in-file cleanup, chunk android-16

All 27 files of `chunks/android-16.files.txt` still exist. `values/styles.xml` (B63) and `testMocks/AndroidManifest.xml`
(B64, duplicate RECORD_AUDIO) were already cleaned by A5; nothing further applied there.

## Done
- `release/DataIntegrityProvider.java`: deleted the redundant `Files.isSymbolicLink` skip (B4: both following checks
  pass `NOFOLLOW_LINKS`, so a link is neither a directory nor a regular file and is skipped anyway); `PATH`, `END`,
  `COLUMNS` and `export` made private (D7: 0 references outside the class, no javac host test compiles it); one
  comment naming the upstream parser (`parseIntegrityExport`) of the row format. Wire format, permissions and the
  failure message are unchanged.
- `res/drawable/notification_icon.xml`: removed the 17 wordmark sub-paths (subpaths 177-193, from `M226.53,99.56`
  to the end, about 9.3 KB) and the `<clip-path>` equal to the viewport (NEW-DEAD-CSS / dead geometry). Proof by
  reading: a parser over the path data (all commands absolute; every sub-path starts with absolute `M`) gives
  control-point hulls with min x >= 150.04 for every removed sub-path, viewport is 120x120, so none of them draws
  or changes the winding of any point inside the viewport; the kept sub-paths are unchanged bytes. No byte pin on
  this file (pins are on the `R.drawable.notification_icon` id only).
- `src/standalone/AndroidManifest.xml`: corrected the stale comment ("all three permissions" before five SMS/MMS
  removal markers) (A8, comment only).
- `embedding-host/build-toolchain.json`: deleted the unread `schema` and `remapBuildPath` fields (A7). Readers
  (`scripts/build-embedding-host.ts`, `android-build-preflight.ts`) read only `ndk`, `cmake`, `engineRepository`;
  no digest of this file is recorded anywhere (`git grep` of its sha256).
- `testMocks/androidTest/.../BrowserAutofillInstrumentedTest.java`: deleted the `assertNotNull(popup)` that follows
  `if(popup==null) fail(...)` (B4); renamed local `previousRequests` to `previousAccepted` (it holds the accepted
  count); imported `AtomicInteger`/`AtomicBoolean` instead of fully-qualified names. Test and method names unchanged.

## Deleted tests and formal artefacts
- None.

## Pins left broken
- None. `test/pilot-update-export.test.mjs` source regexes (`HmacSHA256`, `List.of("cache", "code_cache")`,
  unspaced `){throw new UnsupportedOperationException`) still match.
- Stale but harmless (file not owned): `scripts/build-embedding-host.ts:21` `Toolchain` type still declares
  `remapBuildPath`/`remapBuildPathEvidence`, and `test/strict-build-inputs.test.mjs:17,26,70,163` fixture still writes
  them; `embeddingHostState(_manifest, _toolchain, ...)` and `android-build-preflight.ts:260` still read the file for
  nothing. Owner of those files: drop them (U-O3).

## Skipped
- `drawable/app_icon.xml` trim/move: byte-pinned by `aosp/branding/provision/source-inputs.json` SHA; Q-AOSP-5 Open.
- `values-night/styles.xml` + `values/alpha-launcher.xml` → `colors.xml` theme consolidation, `drawable-v26/app_icon.xml`
  `@color/alpha_brand`: file merge/new files (U-O3, stage F).
- `values/alpha-system-entry.xml` split into `alpha-runtime-notification.xml`: file split (U-A11 c, stage F); tile
  strings stay (D7).
- `values/eliza_passwords.xml` unlock/biometric pins: Q-AND-38 Open.
- `alpha-canonical-notifications.xml` "add comment": not a simplification; `custom_url_scheme` stays (read by
  `getIdentifier`).
- `consumer-host.json` (redundant app deps, `video-fixture`, fixture/sense modules): cross-file (regeneration,
  `gradle-verification`, Quint manifest digests, scripts and tests not owned); resolved Gradle graph not checkable
  here; sense/notification-fixture entries are Q-AND-35 Open.
- `qualified-host.json` `jniIdentityRelocated`: written and required by `scripts/stage-embedding-host.ts:111,149`
  (not owned); removing it from the record alone would fail staging. `model` single-source: needs the script.
- `DataIntegrityProvider` shared hex: B4 map says keep (separate `release/` module). Formatting of packed helpers:
  no reformat in this stage. Whether the provider stays at all: Q-AND-5 Open.
- `SyntheticAutofillService` shared `assign` for hint/autocomplete loops: the two token sets differ (`"password"` is
  accepted as an Android hint but not as an HTML autocomplete value), so one helper would change behaviour or need a
  parameter for a single caller.
- `BrowserAutofillInstrumentedTest`: `BrowserTestDriver`/`DeviceShell`/`LoopbackHttpFixture` extraction (U-L13,
  structural, new files); reflection into upstream `BrowserTabHostPlugin` (owner question 5, needs upstream accessor,
  D14); the 5 s negative wait (documented, inherent); `host()` alias kept (pass-through used ~10 times, inlining is
  churn only).
- Other KEEP files (drawable-v26 icons, `ic_navigation.xml`, `aosp-capabilities.xml`, `xml/*`, `AlphaTelephonyRoles`,
  `testMocks/res/xml/*`): no findings to apply.

## Verification
- Java not compiled: there is no `android/gradlew` (Gradle project is generated by the build pipeline). Checked by
  reading: `git grep DataIntegrityProvider` across apps/android/scripts/test/specs shows only the manifest entry,
  `scripts/apk.ts:101`, a comment in `scripts/pilot-update.ts` and `test/pilot-update-export.test.mjs`; no Java
  reference to `PATH`/`END`/`COLUMNS`/`export`. `BrowserAutofillInstrumentedTest` edits are local; `java.util.*`,
  `android.os.*`, `android.view.*` export no `AtomicInteger`/`AtomicBoolean`, so the new imports do not clash.
- XML well-formedness (python minidom) of `notification_icon.xml` and standalone `AndroidManifest.xml`: ok.
  `build-toolchain.json` parses.
- `node --test` (Node v26.13.0), each file separately, all pass: pilot-update-export 18/18, aosp-image-capability
  12/12, aosp-sms 12/12, strict-build-inputs 6/6, upstream-pin-guard 7/7, android-build-path 7/7, alpha-system-entry
  4/4, android-host 6/6, launcher-orientation 2/2, android-instrumentation-runner 26/26.
- Not run: Gradle compile/assemble, emulator (rendering of the trimmed icon not visually checked; equivalence argued
  geometrically above), `npm run verify`, tsc (no renderer files owned).
