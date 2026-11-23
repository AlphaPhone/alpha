# Chunk android-16 — summary

Reports: `docs/simplification-audit/files/<path>.md` for all 27 assigned files.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| android/app/src/main/java/ai/alphacompute/alphaphone/release/DataIntegrityProvider.java | KEEP (small simplify) | 92 | 88 |
| android/app/src/main/res/drawable-v26/app_icon.xml | KEEP | 6 | 6 |
| android/app/src/main/res/drawable-v26/app_icon_foreground.xml | KEEP | 5 | 5 |
| android/app/src/main/res/drawable/app_icon.xml | MOVE to android/aosp/branding/provision/ + trim (owner) | 9 (24.8 KB) | 0 in app (8 lines, ~15.5 KB in AOSP packet) |
| android/app/src/main/res/drawable/ic_navigation.xml | KEEP | 1 | 1 |
| android/app/src/main/res/drawable/notification_icon.xml | SIMPLIFY (drop clipped wordmark) | 5 (24.5 KB) | 4 (~15 KB) |
| android/app/src/main/res/values-night/styles.xml | MERGE into values/styles.xml (leave values-night/colors.xml) | 15 | 5 |
| android/app/src/main/res/values/alpha-canonical-notifications.xml | KEEP (add comment) | 3 | 4 |
| android/app/src/main/res/values/alpha-launcher.xml | MERGE into values/colors.xml | 4 | 0 (+6 in colors.xml) |
| android/app/src/main/res/values/alpha-system-entry.xml | SPLIT (runtime strings out; tile strings owner) | 25 | 6 (+21 new file), 0 if tile retired |
| android/app/src/main/res/values/aosp-capabilities.xml | KEEP | 10 | 10 |
| android/app/src/main/res/values/eliza_passwords.xml | SIMPLIFY | 18 | 16 |
| android/app/src/main/res/values/styles.xml | SIMPLIFY | 16 | 14 |
| android/app/src/main/res/xml/data_extraction_rules.xml | KEEP | 24 | 24 |
| android/app/src/main/res/xml/mail_attachment_paths.xml | KEEP | 1 | 1 |
| android/app/src/main/res/xml/network_security_config.xml | KEEP | 11 | 11 |
| android/app/src/main/res/xml/storage_paths.xml | KEEP | 1 | 1 |
| android/app/src/standalone/AndroidManifest.xml | KEEP (fix stale comment) | 22 | 22 |
| android/app/src/standalone/java/ai/alphacompute/alphaphone/AlphaTelephonyRoles.java | KEEP | 9 | 9 |
| android/app/src/testMocks/AndroidManifest.xml | SIMPLIFY | 19 | 18 |
| android/app/src/testMocks/androidTest/java/ai/alphacompute/alphaphone/BrowserAutofillInstrumentedTest.java | SIMPLIFY | 220 | ~150 |
| android/app/src/testMocks/java/ai/alphacompute/alphaphone/SyntheticAutofillService.java | KEEP (small simplify) | 54 | 50 |
| android/app/src/testMocks/res/xml/development_network_security_config.xml | KEEP | 5 | 5 |
| android/app/src/testMocks/res/xml/synthetic_autofill_service.xml | KEEP | 2 | 2 |
| android/consumer-host.json | SIMPLIFY | 189 | ~181 (~178 if fixtures/sense retired) |
| android/embedding-host/build-toolchain.json | SIMPLIFY | 7 | 5 |
| android/embedding-host/qualified-host.json | KEEP (simplify writer) | 127 | 126 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `hex(byte[])` | helper | DataIntegrityProvider.java:86 | GoogleWorkspaceReturnFlow.java:35 (same forDigit loop), AlphaDevicePlugin.java:240, WorkflowWorkerAssets.java:26-27, HostedResultNotices.java:31, CalendarSyncSnapshot.java:140, AlphaCredentialStore.java:159 | `ai.alphacompute.alphaphone.util.Digests.hex` |
| `PATH`/`END`/`COLUMNS` row format | const | DataIntegrityProvider.java:34-36 | upstream JS parser `parseIntegrityExport` (vendor/eliza/packages/os/scripts/android/apk-release-record.mjs) | keep; comment cross-reference |
| `NONCE` regex `[0-9a-f]{32,128}` | const | DataIntegrityProvider.java:37 | upstream `integrityQuery` nonce check (JS) | keep both (two trust boundaries) |
| silhouette `pathData` | const (geometry) | drawable/notification_icon.xml:4 | byte-identical drawable/app_icon.xml:7 | single trimmed copy in notification_icon.xml; Provision copy in AOSP packet |
| `#0000FF` brand blue | const | values/alpha-launcher.xml:3 | values/styles.xml:3, values-night/styles.xml:5, drawable/app_icon.xml:4, consumer-host.json:142 (`0xff0000ff`) | `values/colors.xml` `alpha_brand` |
| `AppTheme`, `AppTheme.Launch` | style | values/styles.xml:2,12 | values-night/styles.xml:4,11 | one definition + colour/bool resources per night qualifier |
| `custom_url_scheme` `alphaphone` | const | alpha-canonical-notifications.xml:2 | AndroidManifest.xml:134, AlphaBrowserStores.java:23,37, AlphaConnectionPlugin.java:30 | keep resource; optional Java reads it |
| `alpha_runtime_*` (19 strings) | const | alpha-system-entry.xml:6-24 | names repeated in consumer-host.json:145-163 | new `values/alpha-runtime-notification.xml` |
| `mail-attachments` | const | mail_attachment_paths.xml:1 | AlphaMailAttachmentsPlugin.java:53, AlphaMailFileProvider.java:9 | one Java constant |
| `eliza_passwords_unlock_seconds`, `_allow_biometric` | const | eliza_passwords.xml:8-9 | identical upstream defaults (plugin-native-passwords res) | delete overrides |
| `waitHost`/`click`/`address`/`collect`/`visibleChild`/`childReady` | helper | BrowserAutofillInstrumentedTest.java:24-49 | PasswordBrowserFillInstrumentedTest.java:45-87, BrowserSigninsInstrumentedTest.java:35-49, BrowserWebFeaturesInstrumentedTest.java:53-111, BrowserFlowInstrumentedTest.java:25-33 | androidTest `BrowserTestDriver` |
| `shell(command)` (bounded) | helper | BrowserAutofillInstrumentedTest.java:50-57 | 10 `String shell(` copies in androidTest | androidTest `DeviceShell` |
| inline loopback HTTP server | helper | BrowserAutofillInstrumentedTest.java:181-188 | 12 androidTest files with `ServerSocket(0` | androidTest `LoopbackHttpFixture` |
| `new BrowserFlowInstrumentedTest()` as helper | helper (test class) | BrowserAutofillInstrumentedTest.java:22 | 11 other androidTest files | `BrowserTestDriver` |
| `Fields` / `fields()` | type/helper | SyntheticAutofillService.java:22-40 | none (upstream BrowserLoginFields is product-side) | keep local |
| `model` record | const | qualified-host.json:6-10 | scripts/stage-embedding-host.ts:11 | one source |
| `Toolchain.remapBuildPath`/`remapBuildPathEvidence` | type members | scripts/build-embedding-host.ts:21 (+ build-toolchain.json:6) | — (unread) | delete |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Clipped wordmark sub-paths (from `M226.53,99.56` to end, 9,299 of 24,140 bytes) + `<clip-path>` in drawable/notification_icon.xml | viewport/clip 120×120; the 17 removed sub-paths start at x 156-470; never drawn | High (visual check) |
| Same in drawable/app_icon.xml | same geometry; but byte-pinned by provision/source-inputs.json | High technically; needs AOSP re-pin |
| drawable/app_icon.xml from app res | minSdk 29 → drawable-v26/app_icon.xml always selected; only consumer is scripts/stage-alpha-os-branding.py:133 (AOSP Provision) | Medium (confirm with `aapt2 dump resources`; owner decides location) |
| values-night/styles.xml (as styles) | 6 of ~11 values differ; colour/bool resources express them | High |
| `windowActionBar`/`windowNoTitle` items in AppTheme.NoActionBar (styles.xml:10) | parent already DayNight.NoActionBar | High |
| testMocks/AndroidManifest.xml:4 RECORD_AUDIO | identical to main manifest line 3 | High |
| eliza_passwords.xml:8-9 | equal to upstream library defaults | High (owner may prefer explicit pin) |
| DataIntegrityProvider.java:73 symlink check | NOFOLLOW_LINKS checks already exclude links | High |
| BrowserAutofillInstrumentedTest.java:173 `assertNotNull(popup)` | preceded by `if(popup==null) fail(...)` | High |
| build-toolchain.json `remapBuildPath`, `schema` | never read; remap hard-coded true (build-embedding-host.ts:187,207) | High |
| qualified-host.json `jniIdentityRelocated` | constant written and self-checked by stage-embedding-host.ts:111,149 | Medium-high |
| consumer-host.json app deps: credentials ×2, googleid, androidx.browser, media3 ×2 | declared `implementation` by patched auth and media modules with same versions; no Alpha source import | High (confirm resolved graph unchanged) |
| consumer-host.json `video-fixture` module | no build/run anywhere (android research §3) | High |
| alpha-system-entry.xml:2-5 tile strings | only for disabled AlphaQuickSettingsTile (P14) | Owner decision |
| NOT delete: `custom_url_scheme` | read via `getIdentifier` by generated NativeNotificationProjector.java:123 | — (research wrong) |
| NOT delete: `AppTheme.NoActionBar` | applied by Capacitor BridgeActivity.onCreate | — (research wrong) |
| NOT delete: okhttp dependency | local-speech `compileOnly` needs app runtime copy | — (research wrong) |

## Cross-file actions
1. Trim icon geometry: `android/app/src/main/res/drawable/notification_icon.xml`, `android/app/src/main/res/drawable/app_icon.xml` (or its AOSP-packet copy), `android/aosp/branding/provision/source-inputs.json` (`productIcon.sha256`, geometry), `android/aosp/branding/provision/README.md`, `scripts/stage-alpha-os-branding.py` (path if moved), `test/aosp-fresh-presets.test.py:102`.
2. Move legacy icon out of app res: `android/app/src/main/res/drawable/app_icon.xml` → `android/aosp/branding/provision/`; optionally move `drawable-v26/app_icon.xml` + `app_icon_foreground.xml` to `drawable/`; update `source-inputs.json` `productIcon.path`.
3. Theme consolidation: `values/styles.xml`, delete `values-night/styles.xml`, new `values/colors.xml` + `values-night/colors.xml`, delete `values/alpha-launcher.xml`, update `drawable-v26/app_icon.xml:3` to `@color/alpha_brand`.
4. Split runtime notification strings: `values/alpha-system-entry.xml` → new `values/alpha-runtime-notification.xml`; update `test/alpha-system-entry.test.mjs:15`, `test/android-host.test.mjs:160`. If tile retired: also `AlphaQuickSettingsTile.java`, `AndroidManifest.xml:94`, Quint `assistant-entry-platform.mjs`, tile tests.
5. Drop redundant app deps: `android/consumer-host.json:50-53,55-56`; regenerate via `scripts/android-host.ts`; `scripts/gradle-verification.ts` / `android/gradle/verification-metadata.xml` check; re-pin `specs/quint/native/manifest.json` and `specs/quint/services/manifest.json` digests of consumer-host.json.
6. Remove video-fixture: `android/consumer-host.json:46`, `android/video-fixture/`, `test/android-host.test.mjs:119,122`, `scripts/ci/affected.ts:14` (+ move `qa-source.mp4` to `test/fixtures/` and update `test/browser/media-polish.spec.ts`, `native-video-library-change.spec.ts`).
7. Embedding-host record cleanup: `android/embedding-host/build-toolchain.json`, `scripts/build-embedding-host.ts:21,88`, `scripts/android-build-preflight.ts:260`, `test/strict-build-inputs.test.mjs:17,26,70,163`; `jniIdentityRelocated`: `scripts/stage-embedding-host.ts:34,111,149`, `android/embedding-host/qualified-host.json:31`, `test/embedding-host-admission.test.mjs:156`, `test/android-build-path.test.mjs:239`.
8. Browser instrumentation driver: new androidTest `BrowserTestDriver`, `DeviceShell`, `LoopbackHttpFixture`; adopt in `BrowserAutofillInstrumentedTest.java`, `PasswordBrowserFillInstrumentedTest.java`, `BrowserSigninsInstrumentedTest.java`, `BrowserWebFeaturesInstrumentedTest.java`, `BrowserFlowInstrumentedTest.java` and the 11 files that instantiate `BrowserFlowInstrumentedTest` as a helper.
9. Shared Java hex/digest util: `DataIntegrityProvider.java:86`, `GoogleWorkspaceReturnFlow.java:35`, `AlphaDevicePlugin.java:240`, `WorkflowWorkerAssets.java:26-27`, `HostedResultNotices.java:31`, `CalendarSyncSnapshot.java:140`, `AlphaCredentialStore.java:159`.

## Text/path pins
- DataIntegrityProvider.java: `test/pilot-update-export.test.mjs:54-70` (source regexes: `HmacSHA256`, `List.of("cache", "code_cache")`, unspaced `){throw new UnsupportedOperationException` for insert/delete/update, manifest provider attributes), `test/support/feature-parity.mjs:175`, `scripts/apk.ts:101`.
- drawable/app_icon.xml: `android/aosp/branding/provision/source-inputs.json:77-90` (SHA-256 b3d0e893…), `scripts/stage-alpha-os-branding.py:133-136`, `test/aosp-fresh-presets.test.py:102`, `android/aosp/branding/provision/README.md:50`.
- notification_icon / ic_navigation R ids (not bytes): `test/alpha-system-entry.test.mjs:17,107`, `test/android-host.test.mjs`, `test/gmail-background-lock-contention.test.mjs`, Quint `assistant-entry-platform.mjs`, `gmail-background-platform.mjs`, `source-renewal-platform.mjs`, `navigation-service-platform.mjs:13`, `WorkflowNoticeTraces.java`.
- alpha-system-entry.xml: `test/alpha-system-entry.test.mjs:15`, `test/android-host.test.mjs:160`.
- aosp-capabilities.xml: `scripts/aosp-capability-overlay.ts`, `test/aosp-capabilities.test.mjs`, `test/aosp-image-capability.test.mjs`, `android/aosp/pixel10a-composition.json`.
- mail_attachment_paths.xml: `specs/quint/native/manifest.json:1888`, `specs/quint/refinement/native/reviewed-copies.mjs:17`.
- network_security_config: upstream `apk-distribution.mjs:120-122` (release must declare it); `development_network_security_config.xml`: `scripts/apk.ts:121`.
- standalone manifest: `test/android-host.test.mjs:73`, `test/aosp-image-capability.test.mjs:163-172,236-240`, `test/aosp-sms.test.mjs:244-249`, `test/launcher-orientation.test.mjs:17`, `scripts/source-snapshot.ts:8`.
- standalone AlphaTelephonyRoles: `test/aosp-image-capability.test.mjs:254` (`static void sync\(Context context\) \{\}`), Quint `main-activity-platform.mjs`.
- testMocks manifest: `test/android-host.test.mjs:93`, `test/cloud-sign-in-flow.test.mjs:78-92`, `test/login-surfaces.test.mjs:230-242`, `scripts/apk.ts:120`.
- SyntheticAutofillService: `scripts/apk.ts:78`, `scripts/scan-archived-apks.py:40`.
- BrowserAutofillInstrumentedTest: `scripts/android-instrumentation.ts:160`, `scripts/owner/emulator-campaign-check.ts:45,59`, `test/android-instrumentation-runner.test.mjs:87,132`.
- consumer-host.json: `test/android-host.test.mjs` (paths, module list incl. video-fixture, residentHost), `test/alpha-system-entry.test.mjs:99-127`, `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`, eight Quint native refinement `.mjs` files, many scripts (see report).
- build-toolchain.json / qualified-host.json: `test/upstream-pin-guard.test.mjs:104`, `test/strict-build-inputs.test.mjs`, `test/embedding-host-admission.test.mjs:156`, `test/android-build-path.test.mjs:239`, `test/embedding-artifact-inputs.test.py`, `test/sbom.test.mjs`, `scripts/ci/embedding-artifacts.py`, `scripts/ci/hosted-native-inputs.py`.

## New patterns
- NEW-dead-geometry: vector drawables carrying path data outside their viewport and removed by a clip-path (9.3 KB per icon here, the wordmark of the full logo). Treatment: trim at source, drop the clip.
- NEW-redeclared-default / transitive dependency: host resources or Gradle coordinates that restate exactly what the library already declares (`eliza_passwords` unlock/biometric defaults; six app-level dependencies already `implementation` in patched modules). Treatment: delete unless the owner wants an explicit pin, and then say so in a comment.
- NEW-test-class-as-helper: androidTest classes instantiated as helper libraries (`new BrowserFlowInstrumentedTest()` in 12 files) to reach package-private helpers. Treatment: extract a plain driver class.
- Audit-method note (not a code pattern): resources read by name via `getIdentifier` (e.g. `custom_url_scheme`) or applied by a library base class (`AppTheme.NoActionBar` via Capacitor `BridgeActivity`) are invisible to plain greps; check `getIdentifier("…")` and `node_modules`/upstream base classes before deleting a resource.

## Owner questions
1. Should the AOSP Provision setup icon stay byte-identical to an app resource, or may `drawable/app_icon.xml` move into `android/aosp/branding/provision/` (and be trimmed, with a new pinned SHA)?
2. Retire the dormant Quick Settings tile (P-78/P14)? If yes, its four strings in `alpha-system-entry.xml` go with it.
3. Should Alpha keep explicit `eliza_passwords_unlock_seconds=60` / `allow_biometric=true` pins even though they equal the library defaults?
4. Retire `notification-fixture`, `sense` and `sense-speech` module entries in `consumer-host.json` (manual campaign / dev-only)?
5. May `BrowserAutofillInstrumentedTest` stop reflecting into upstream `BrowserTabHostPlugin` private fields (needs an upstream accessor or an outcome-only assertion)?
