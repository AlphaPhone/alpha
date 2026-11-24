# Chunk test-25: host tests canonical-* to cloud-membership-*

36 assigned files, 35 present (`test/canonical-maps-return.test.mjs` already deleted). Reports are in
`docs/simplification-audit/files/test/<name>.md`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| canonical-calendar-draft-ownership | bundled module + stub ports (fixture) | DELETE (T4) | Quint `canonical-calendar-draft` replay keeps the fixture |
| canonical-icons | source-text + transplant | REWRITE | `scripts/vendor-lucide-icons.ts --check`; rendered icons in `journeys/home-shell.spec.ts` |
| canonical-maps-return | (missing) | already deleted | - |
| canonical-note-calendar-admission | transplant | DELETE | 2 steps in `journeys/notes.spec.ts` |
| canonical-notes-draft-copy | Quint fixture reuse | DELETE (T4) | `canonical-notes-draft-copy.spec.ts` + checklist case |
| canonical-notes-webview-abort | transplant + source-text | DELETE | `AbortSignal.any` rule to bundle audit; 2 notes journey steps |
| canonical-notification-navigation | wrapper (T9) + script transplant | DELETE (with `scripts/test-canonical-notification-navigation.ts`) | `journeys/notifications.spec.ts` (4 cases) |
| canonical-notification-security | Java slice transplant | REWRITE | Gradle JVM test of `RendererCredentialSlots` + tap age; or DELETE (owner) |
| canonical-recording-audio-save | transplant | DELETE | `journeys/notes.spec.ts` voice: lost reply makes no duplicate |
| canvas-geometry | unit + transplant | MERGE | `journeys/home-shell.spec.ts` viewports, `journeys/calendar.spec.ts` columns |
| chat-attachment-composer | fixture + Quint replay | DELETE (T4) | Quint aggregate already runs it |
| chat-navigation-detent | transplant | DELETE | 3 steps in `journeys/chat.spec.ts` |
| chat-release | marker transplant | DELETE (+ marker comments) | `journeys/chat.spec.ts` (from `full-chat-grabber.spec.ts`) |
| chat-stop-controls | transplant + template DOM | DELETE (T4) | chat journey |
| chat-transcript-window | JSDOM transplant | REWRITE | `journeys/chat.spec.ts` long-conversation step |
| chat-ui-failed-turn | transplant + source-text | DELETE | 3 chat/connection-cloud journey steps |
| checkin-choice-presentation | unit + transplant | MERGE (parser cases) / DELETE (transplant) | chat journey check-in step |
| chooser-direct-entry | transplant | DELETE | startup-permissions + connection-cloud journeys |
| ci-affected | tooling integration | KEEP / MERGE | `test/tooling/ci-selection.test.ts` |
| ci-emulator-evidence | tooling integration + workflow text | SPLIT | keep suite cases; action-pin/permission rule to `scripts/ci/check-workflows.ts` |
| ci-pin-bound-scripts | data consistency | DELETE | script enforces its own pin at run time |
| ci-required-checks | tooling unit + workflow text | MERGE / DELETE | `requiredResult` to ci-selection; ruleset-name rule to workflow lint |
| ci-ruleset-readback | owner-tool unit | KEEP (minus source-text) | owner tools suite |
| client-feature-preparation | tooling integration | KEEP / REWRITE inventory part | `test/tooling/upstream-sources.test.ts` |
| client-observation-handshake | unit | DELETE | optional Calendar chat step |
| clock-native-contract | JVM contract + source-text | KEEP test 1 / DELETE test 2 | Gradle JVM or upstream |
| clock-repeat-days | unit + upstream comparison | MERGE comparison / DELETE rest | surviving clock contract case |
| cloud-conversation-chunks | voice vm transplant | DELETE | `journeys/voice.spec.ts` |
| cloud-delegation-callback | bundled component JSDOM | REWRITE | `journeys/connection-cloud.spec.ts` (5 cases) |
| cloud-deployment | tooling + JVM integration | KEEP (drop text checks, replace Java slice) | `test/tooling/cloud-deployment.test.ts` |
| cloud-email-deployment | tooling integration | MERGE | cloud-deployment suite |
| cloud-email-resend | unit + JVM + source-order | DELETE test 3; keep/upstream 1-2 | upstream follow-up |
| cloud-environment-selection | unit + transplant + source-text | DELETE | production bundle audit + dev journey |
| cloud-maps-session | bundled module unit | DELETE | `journeys/maps.spec.ts` account switch |
| cloud-membership-presentation | component JSDOM | MERGE | account-sheet + accessibility journeys |
| cloud-membership-ui | static markup regex | DELETE | account-sheet journey |

Counts: DELETE 21 (incl. the already-missing file), KEEP 4 (ci-affected, ci-ruleset-readback, client-feature-preparation,
cloud-deployment, each trimmed), MERGE/REWRITE/SPLIT 11.

## Behaviours that lose all coverage if the DELETEs land without replacements
- Renderer secure slots cannot read/write the native notification-owner slot, and the 5-minute tap age window
  (`canonical-notification-security`). No Quint trace or instrumentation test covers these. Needs the Gradle JVM test.
- Workflow supply-chain policy: commit-pinned actions, third-party allow-list, write/id-token only in the two signing
  and one publication workflow (`ci-emulator-evidence:97-130`). Must move to a workflow lint before deletion.
- Required-check names in `required-checks-ruleset.json` exist as workflow job names (`ci-required-checks:91-100`).
- Delegated authorization return handling across account/scope/client changes (`cloud-delegation-callback`): no
  browser spec touches it.
- Chat windowing of long conversations (20 closed / 100 open / +100 on scroll) (`chat-transcript-window`).
- Check-in `[CHOICE]` suffix hidden only for service rows; hostile quoted/fenced input preserved (`checkin-choice-presentation`).
- Effect-applied failure copy ("Done … reply cut off") and rolled-back receipts (`chat-ui-failed-turn`).
- Maps requests/tiles refused after an account switch (`cloud-maps-session`).
- Voice recording: one note per clip after a lost create reply (`canonical-recording-audio-save`).
- Canvas keyboard-is-not-rotation heuristic edge cases (`canvas-geometry`); a journey covers the main case only.
- Notification tap routing per kind and draft preservation (`canonical-notification-navigation` script).
- Membership-code error accessibility wiring and "Not available" (never $0.00) balance (`cloud-membership-*`).
- Client observation handshake surviving a cancelled first handshake (`client-observation-handshake`); low value.

## Shared helpers worth keeping
- `test/fixtures/canonical-calendar-draft-owner.mjs` and `test/fixtures/chat-attachment-composer.mjs`: still imported by
  live Quint refinement harnesses (`specs/quint/refinement/application/canonical-calendar-draft.mjs`,
  `chat-attachments.mjs`); move beside those harnesses once host tests stop importing them.
- `specs/quint/refinement/application/canonical-notes-feedback.mjs` stays (Quint harness); only this chunk's host reuse goes.
- `test/fixtures/git-fixture.mjs` (ci-affected, client-feature-preparation): keep for the tooling suites.
- `test/fixtures/jvm-tools.mjs`: keep while JVM cases remain (clock-native-contract, cloud-deployment, cloud-email-resend);
  `test/fixtures/ClockContractTest.java` only for clock-native-contract.
- `test/fixtures/assert-order.mjs`: imported but unused by `chooser-direct-entry`; its remaining users are source-order tests (T1) and it should go with them.

## Cross-file actions
- Delete `scripts/test-canonical-notification-navigation.ts` with its wrapper.
- Remove the `// chat-release:begin/end` marker comments in `apps/app/src/prototype/chat-overlay-motion-adapter.ts` with `chat-release.test.mjs` (D7).
- Export `productionSpec` from one module and import it in `playwright.config.ts` (then drop the sync regex).
- Make `scripts/ci/affected.ts` derive `browserReadAndroid` by scanning specs instead of a hard-coded list.
- Add `--check` to `scripts/vendor-lucide-icons.ts`; run it in `verify`.
- Add an `AbortSignal.any`/minimum-WebView API rule to `scripts/audit-production-bundle.ts`.
- New `scripts/ci/check-workflows.ts` (YAML-parsed action pins, permission allow-list, ruleset job names), run when `.github/**` changes.
- Move `AlphaCloudSignInPlugin.registration(boolean)` to its own Java file so the deployment JVM test compiles whole files.
- Move `scripts/ci/read-required-checks.ts` to `scripts/owner/` with its test.
- `chooser-direct-entry` "Restore saved sign-in" and `canonical-calendar-draft-ownership` recovery case go with D1/C5/C6.
- Upstream follow-ups (D14): clock repeat-day TS/Java contract test, `CloudEmailCode.resendAt` deadline table.

## Owner questions
1. Adopt a Gradle JVM (Robolectric) lane in `android.yml` for native security-boundary tests (notification-owner slot refusal, tap age), or accept losing them?
2. Keep the `HOST` sha256 pin of `AlphaCalendarPlugin.java` in `scripts/ci/calendar-bridge.py` (every plugin edit must update CI), or drop it?
3. Retire `reproduce-paradee-model.yml` and its script (dispatch-only reproduction)?
4. Is Cloud delegated authorization (`cloud-delegation-ui.tsx`) reachable in production builds, or only via test-mocks (then D5 deletes it)?
5. Should Alpha import upstream's `validateClockOperation` and drop its own `runtime/clock-contract.ts`?
6. Accept two pure-algorithm exceptions to "no unit tests": the canvas keyboard-swap heuristic and the check-in `[CHOICE]` parser over hostile input?
