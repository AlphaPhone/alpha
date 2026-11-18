# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VideoInstrumentedTest.java
- Lines: 126 | Role: Camera video journey: record a real CameraX MP4, check the owned MediaStore row and decoded frame, play/pause/range-fetch it in Photos, recreate the activity and replay it; second method checks that leaving Camera finalizes the recording. | Verdict: SIMPLIFY
- Importers: none (JUnit class). Run by `scripts/android-instrumentation.ts:287` registry entry `Video: {}` (opt-in via `--classes Video` / `--all`; not in `DEFAULT_CLASSES`). Text/path pins: none (`git grep VideoInstrumentedTest` outside androidTest: 0 hits; not in specs/quint manifests, `test/support/feature-parity.mjs` or `LemmaScript-files.txt`). Reads androidTest asset `video-account-fixture.js`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-35 | C3 | Private `eval`, `until` (30 s poll), `click(label)` and `navigate(label)` copies: `private void until(String js)throws Exception{ long end=SystemClock.elapsedRealtime()+30000; ...`. The same poll/click/navigate trio is re-declared in 88 androidTest files (`git grep 'private .*void until(\|private void ready('`: 88 hits). | Add `WebViewTestDriver.until(String js, long ms, String label)`, `click(String ariaLabel)` and `navigate(String view)` (navigate = `AppNavigation.request` + `selected`) once; delete lines 25-35 here. | Low; same semantics. |
| 2 | 72, 74 | C3 | Sign-in form drivers are copied from `InboxFixtureSignIn.DRIVE_EMAIL` / `DRIVE_CODE` with only the address changed (`field.value='video-fixture@example.invalid'`). | Make `InboxFixtureSignIn.driveEmail(String email)` (or move both drivers to `AppNavigation`) and call it here. | Low. |
| 3 | 36-43 | D7 / B1 | `playbackDiagnostics()` reflects into upstream `PhotosPlugin.playback` private field and swallows every error to `error.getClass().getSimpleName()`. Used only to enrich one failure message (line 102). | Delete; the range assertion message already includes `window.__videoRange`. If kept, it belongs upstream with `OwnedVideoPlayback`. | Low (diagnostic only). |
| 4 | 101 | D8 | One ~1,300-character JS string performing the range fetch. | Move the range-fetch script to an androidTest asset (`video-range-probe.js`) or a multi-line text block; keep assertions unchanged. | Low. |
| 5 | 102 | D8 | Five assertions on one line. | One assertion per line during the formatter pass. | None. |
| 6 | 21, 90 | D11 | "durable prototype library", method name `...PrototypeControlsDriveRealPlayback`: the renderer core is product code, not a prototype. | Rename method/comment when touched (no runner pins the method name: grep 0). | None. |
| 7 | 112, 124 | C3 | Identical cleanup `finally{Set<Uri> created=owned();created.removeAll(before);for(Uri uri:created)...delete}` in both tests. | One `deleteCreated(before)` helper. | None. |
| 8 | 60-77 | NEW (dual-build branch) | `admitAccount()` has two whole paths: test-mocks → `AppNavigation.liveMode()`, flag-off → install JS fixture and drive the production sign-in page. Many classes carry the same fork (`VoicePermissionDenied` lines 53-81). | Keep (both variants must be verified per AGENTS.md) but move the fork into one shared `AppNavigation.admitSignedIn(FixtureKind)`. | Medium: sign-in readiness timing comments (P-43) must move with it. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval` | helper | 25 | 62 androidTest files declare `js(`/`eval(`/`evaluate(` wrappers (research P20) | delete; call `WebViewTestDriver.evaluate` |
| `until` | helper | 26-30 | `VoiceNoteReadAloudInstrumentedTest:24`, `VoicePermissionDeniedInstrumentedTest:29`, `WorkflowDraftNativeInstrumentedTest:15` (`ready`), `WorkflowPhoneNativeInstrumentedTest:23` (`ready`), 80+ more | `WebViewTestDriver.until` |
| `click(label)` | helper | 31-34 | `VoicePermissionDeniedInstrumentedTest:30-31` (`button`/`click`) | `WebViewTestDriver.click` |
| `navigate(label)` | helper | 35 | inline in `VoicePermissionDeniedInstrumentedTest:65,77-78,111`, `WorkflowPhoneNativeInstrumentedTest:63,77` | `AppNavigation.go(view)` |
| `permission()` | helper | 56-59 | grant loops in many classes | keep local (single use) |
| `owned`/`created` | helper | 44-55 | MediaStore owner queries in `PhotoLibrary*`, `PhotosLibrary*` tests | keep local |

## Proposed end state
Two test methods plus `begin`, `assertMedia`, `owned/created`, `admitAccount` (calling a shared sign-in driver). Shared `until/click/navigate` come from `WebViewTestDriver`/`AppNavigation`; `playbackDiagnostics` reflection deleted; the range probe script lives in an asset or a readable block. About 90-95 lines.

## Verification
Only coverage: `node scripts/android-instrumentation.ts --classes Video` on a flag-off and a test-mocks build (camera + microphone on an emulator). Renderer side also covered by `test/browser/media-polish.spec.ts` (separate). Re-run both variants after editing shared helpers.
