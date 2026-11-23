# Chunk test-27: connection, contacts/context, core-state, credentials, deletion, dev tooling

27 host test files, 3,370 lines. Every file was read in full. Reports are in `files/test/<name>.md`.

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| `test/connection-browser-return.test.mjs` | 66 | transplant (native-connection.ts) | DELETE | 4 cases → `test/integration/connection-cloud.test.ts` (real import, function is exported) |
| `test/connection-chooser-focus.test.mjs` | 37 | transplant (React effect slice) | DELETE | 1 step → `journeys/connection-cloud.spec.ts` |
| `test/connection-contracts.test.mjs` | 13 | wrapper (T9) for `scripts/test-remote-protocol.ts`, `test-connection-history.ts` | DELETE wrapper | remote-protocol suite deleted with C4; history suite dissolved into `test/integration/connection-cloud.test.ts` |
| `test/connection-presentation-state.test.mjs` | 1011 | transplant (~30 slices of connection-ui.tsx) | DELETE after stage-F split | ~15 cases → `connection-cloud.test.ts`, `journeys/connection-cloud`, `chat`, `settings` |
| `test/connection-recovery-state.test.mjs` | 141 | transplant + vendor regex | DELETE | 2 cases → `connection-cloud.test.ts` (failure-kind table, identity-read retry) |
| `test/connection-routes.test.mjs` | 78 | host-JVM (test 1) + source-text (tests 2–5) | KEEP test 1 / DELETE 2–5 | Gradle JVM `ConnectionRoutesTest` |
| `test/connection-step-contracts.test.mjs` | 148 | transplant + real local-agent import | DELETE / MERGE | local-agent cases → `test/integration/resident-runtime.test.ts`; secrets fallback → `connection-cloud.test.ts` |
| `test/connection-work-lifecycle.test.mjs` | 6 | transplant | DELETE | 1 follow-up case after split |
| `test/contacts-adapter.test.mjs` | 217 | esbuild bundle + stub map, fake Shell | REWRITE | `journeys/phone-sms-contacts.spec.ts` (AOSP-image Contacts) |
| `test/context-selection.test.mjs` | 280 | unit + source-text + transplant | DELETE | folder half with C19; 1 photo-rewrite step → `journeys/camera-photos.spec.ts` |
| `test/conversation-history-refresh.test.mjs` | 10 | source-text | DELETE | optional `journeys/chat.spec.ts` step |
| `test/conversation-restore-safety.test.mjs` | 86 | transplant | DELETE | 3 CAS cases → `connection-cloud.test.ts` after split; 1 chat reload step |
| `test/core-runtime-transform.test.mjs` | 28 | harness-helper test + hash ceremony | DELETE | covered by `core-runtime/turns.mjs` replay |
| `test/core-state-patch.test.mjs` | 154 | tooling (real git, bun, fs) | KEEP (drop test 6) | MOVE → `test/tooling/upstream-sources.test.ts` |
| `test/credential-owner-admission.test.mjs` | 82 | host-JVM transplant (Java method slices) | REWRITE | Gradle JVM `CredentialFencesTest` over extracted class |
| `test/credential-slot-lock-order.test.mjs` | 97 | host-JVM transplant | REWRITE | same `CredentialFencesTest` |
| `test/credential-stop-dispatch.test.mjs` | 94 | host-JVM transplant | REWRITE | same `CredentialFencesTest` |
| `test/cuttlefish-launcher-postboot.test.mjs` | 80 | tooling (fake adb) | KEEP | MOVE → `test/tooling/aosp.test.ts` |
| `test/dc-lite-keys.test.mjs` | 70 | bundle-with-text-replace + JSDOM; source-text | REWRITE | step in `journeys/settings.spec.ts` |
| `test/deletion-notice-policy.test.mjs` | 73 | unit with stub ports (real module) | MERGE | 3 cases → `test/integration/calendar.test.ts` |
| `test/deletion-window.test.mjs` | 55 | upstream code (T5) | DELETE | upstream follow-up |
| `test/deliver-app-update.test.mjs` | 208 | tooling | KEEP | MOVE → `test/tooling/release-signing.test.ts` |
| `test/demo-copy.test.mjs` | 43 | source-text + audit tooling | MERGE | audit case → `test/tooling/apk-verify-audit.test.ts`; "MVP" rule → bundle DENYLIST |
| `test/dev-cartesia.test.mjs` | 34 | dev tooling | DELETE | (optional `test/tooling/dev-launchers.test.ts`) |
| `test/dev-local-launcher.test.mjs` | 63 | tooling with fake repo + build-flags transplant | DELETE | bundle audit is the release gate |
| `test/dev-speech-settings.test.mjs` | 37 | dev tooling + A8 refusal tables | DELETE | script loses retired-key tables |
| `test/dev-surface-gates.test.mjs` | 176 | Vite-SSR integration + 1 transplant | REWRITE | `journeys/production-gating.spec.ts` (production project) |

Counts: KEEP 4 (including `connection-routes` test 1 only), MERGE / REWRITE 9, DELETE 14.

Corrections to `research/tests-host.md`: `core-state-patch` is a TS tooling test with real git/bun (one `python3 -c`
read), not a Python unittest. `dc-lite-keys` uses JSDOM, not real IO. `contacts-adapter` is a stub-map bundle of a real
module (B+D7), not a slice. `connection-routes` test 1 is worth keeping; tests 2–5 are bucket A.

## Behaviours that would lose all coverage if the DELETEs happen without a replacement

- **Plan recheck on network return (Root #743)**, about 25 cases in `connection-presentation-state.test.mjs:339-668`:
  once-a-minute limit, lift on an offline→online edge, retirement by admissions and provider-class changes. No Playwright
  spec covers it. Needs the stage-F `connection-ui.tsx` split to expose an importable controller first.
- **Conversation restore compare-and-set** (`conversation-restore-safety.test.mjs:36-50`): a newer manual choice wins over
  restore fallback creation.
- **Cloud browser hand-off visibility race** (`connection-browser-return`): focus without a background transition must not
  complete sign-in. Cheap to keep: `openConnectionBrowser` is already exported.
- **Upstream failure kinds all have owner copy** (`connection-recovery-state.test.mjs:44-58`): guards pin bumps.
- **Contacts owner-data safety** (`contacts-adapter`): version-carrying save/delete, stale editor, uncertain write needs an
  explicit refresh. `specs/quint/refinement/native/telephony.mjs:334` states the model relies on this file. Port before deleting.
- **Credential fences on Android** (three `credential-*` files): owner admission after destroy, lock order L-before-vault,
  shutdown reservation across dispatch failure and uncertain commits. No instrumentation equivalent. Rewrite, do not delete.
- **Deletion notice owner staleness** (A→B→A): only in `deletion-notice-policy`.
- **Photo in-place rewrite refused at send time** (`context-selection.test.mjs:192-216`): not in the browser spec.
- **Hidden-notification wording matches across Java and TS** (`context-selection.test.mjs:92-97`): only a source-text check
  exists; see Q2.
- **Flag-off build gating** (`dev-surface-gates`): staging, `?mode=dev`, local agent bridge, regional Maps, fixture Settings
  controls. Partly covered by the bundle audit (strings only); the behaviour needs `journeys/production-gating.spec.ts`.
- `conversation-history-refresh`: `historyRefreshRequired` resync has no other test (low value).

## Shared helpers worth keeping

- `test/fixtures/core-state-root.mjs`: also imported by 9 `specs/quint/refinement/services/*launcher*` harnesses and
  `test/android-build-path.test.mjs`. Survives.
- `test/fixtures/jvm-tools.mjs`: imported by the JVM files here and many others; retires once JVM tests move to Gradle.
- `test/fixtures/ConnectionRoutesTest.java`: only importer is `connection-routes`; moves to `android/app/src/test`.
- `test/fixtures/child-suite.mjs`: loses this importer (it has others in other chunks).
- `test/support/strip-types.mjs`, `test/fixtures/browser-source.mjs`, `test/fixtures/wait-for.mjs`: lose importers here;
  their fate depends on the other transplant chunks.
- The `AlphaContacts` Capacitor fake in `test/browser/aosp-contacts.spec.ts` should become the shared harness bridge
  entry used by `journeys/phone-sms-contacts.spec.ts`.

## Cross-file actions

1. Delete the marker comments in `apps/app/src/runtime/connection-ui.tsx` that exist only as slice anchors (`// P-43: where`,
   `/*\n * DEVELOPMENT INFRASTRUCTURE`, `/** Explicit account/plan`, …) together with the transplant files here (D7).
2. Remove the env knobs nothing sets: `ALPHA_FOCUS_BASELINE`, `ALPHA_PRESENTATION_SOURCE`, `ALPHA_RESTORE_SOURCE`,
   `ALPHA_CONNECTION_SOURCE` (the last is also read by `test/settings-signout-confirm.test.mjs`, other chunk).
3. With C4: delete `scripts/test-remote-protocol.ts`, the remote/paired cases of `test-connection-history.ts`,
   `connection-step-contracts` remote/delegation cases, `dev-surface-gates` remote-origin cases. Update
   `test/browser/connection-boundaries.production.spec.ts:411-412`.
4. With C19: delete the folder cases of `context-selection.test.mjs` and the folder exports of `context-selection.ts` (B196).
5. With D2 (Wallet): `dev-surface-gates.test.mjs:138-160` fails as soon as `VIEWS.wallet` is gone in mock builds; delete it
   in the same change.
6. Extract Android credential fence logic from `AlphaLocalAgentPlugin`/`AlphaConnectionPlugin`/`AlphaCredentialStore`
   into a root-package class (R3) so `CredentialFencesTest` can run under `testDebugUnitTest`. Add JUnit as
   `testImplementation`; no `android/app/src/test` exists yet.
7. Bundle audit: add a `\bMVP\b` string rule and loopback dev-origin literals to `scripts/audit-production-bundle.ts`.
8. Scripts: drop the retired-key refusal tables in `scripts/dev-speech-settings.ts` (A8); import the update-channel URL in the
   delivery test instead of the literal.
9. Upstream follow-up (D14): `deletion-window` and the duplicated `CredentialIntentFence.java` (two upstream copies).
10. CI: the tooling files kept here run only when their scripts change (`core-state-*`, `deliver-app-update`/`update-channel`,
    `verify-cuttlefish-launcher`/`verify-pixel10a-image`); the Gradle JVM tests run in the Android lane only for their Java paths.

## Owner questions

1. Is the Root #743 plan-recheck-on-network-return behaviour important enough to keep its ~25 cases as integration tests
   (requires extracting the connection controller first), or is a smaller set enough?
2. The hidden-notification title/text must match between Java (`AlphaNotificationsPlugin.appLabel()`, upstream host plugin)
   and `context-selection.ts`. Keep it as an emulator instrumentation check, or accept no coverage?
3. Does any installed phone still follow the retired `app-stable` update channel? If not, `LEGACY_APP_UPDATE_TAG` and its
   version-floor checks in `deliver-app-update` can go.
4. Keep one small `test/tooling/dev-launchers.test.ts` for developer secret-file hygiene (`dev-cartesia`, `dev-speech-settings`),
   or delete both (recommended)?
5. Can the bundle audit refuse any shipped string literal containing "MVP"?
