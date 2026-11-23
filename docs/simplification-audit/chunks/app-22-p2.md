# Chunk app-22-p2: connection-ui.tsx lines 2104-4206

Report: `docs/simplification-audit/files/apps/app/src/runtime/connection-ui.tsx.part2.md`

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/connection-ui.tsx (2104-4206) | SPLIT (+ delete dead/legacy, move dev surfaces to `runtime/dev/`) | 2,103 | ≈1,780 across split files (pre-formatter); ≈230 move to dev, ≈50 deleted, ≈70 saved by helpers |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `checkAccount` closure | helper | connection-ui.tsx:2302, :2365 | connection-ui.tsx:1883 (part 1) | `connection/cloud-account.ts` `assertCloudCredentialCurrent` |
| bounded operation wait loop | helper | connection-ui.tsx:2705, :2930, :2941, :2976 | — | `connection/state.ts` `waitForOperationRelease` |
| connectResident + recovering fallback | helper | connection-ui.tsx:2693, :3150, :3306 | :2624, :2666 variants | `connection/resident.ts` |
| WorkflowHttpError mapping | helper | connection-ui.tsx:2482, :2493, :2495 | — | `runtime/workflow-protocol.ts` `toWorkflowHttpError` |
| inline UUID regex | const | connection-ui.tsx:2436 | `validateUuid` (imported :25); research C3 copies | use `validateUuid` |
| SMS thread type (inline) | type | connection-ui.tsx:2283 | `prototype/sms-adapter.ts:12` `OpenThread`; `runtime/telephony-executor.ts:45` | shared SMS types module |
| paired voice binding type (inline) | type | connection-ui.tsx:2531 | `runtime/paired-voice.ts:6` `Binding` | export from `paired-voice.ts` |
| automations client type (inline) | type | connection-ui.tsx:2460 | `prototype/automations-adapter.ts:17` `Binding` + cast :62 | automations module export |
| staleness fence `current()` closures | helper | ≈20 sites, connection-ui.tsx:2195–3407 | part 1 (research: 26 `const current=` in file) | `captureConnection()` in `connection/state.ts` |
| JSON.stringify identity compare | helper | connection-ui.tsx:2262, 2269, 2356, 2360, 3342, 3369, 3378, 3427 … | `main.tsx:102,430`, `calendar-sync-host.ts:99`, `agent-calendar.ts:14` | `sameSession`/`sessionKey` helper |
| `day` / short date format | helper | connection-ui.tsx:3953, :3856, :3913 | `prototype/settings-adapter.ts:922`, `runtime/cloud-membership-ui.tsx:13` | `lib/format-date.ts` |
| dialog focus trap | helper | connection-ui.tsx:3801-3812 | `hosted-digest-ui.tsx:376`, `browser/domain-recovery.ts:54`, `prototype/subview-accessibility.ts:89,129` | `runtime/modal-inert.ts` `trapFocus` |
| icon span markup | JSX | 42 sites in range | 5 more in part 1 / other files (research: 49 total) | `<Icon name>` component |
| `env` (cloud env resolver) | helper | connection-ui.tsx:3814 | `cloudEnvironmentAllowed` :209, `cloud-protocol.ts:52`, `cloud-environment-selection.ts` | `cloud-environment-selection.ts` |
| `pairedRequest`, `hosted` | helper/const | connection-ui.tsx:2115, :2126 | — | `runtime/dev/hosted-connection.ts` |
| `OwnKeyForm` | component | connection-ui.tsx:4087 | test-mocks Cerebras form :4044 | `connection/panels/provider-keys.tsx` |
| `ProviderKeyStatus`/`ProviderKeysProps` | type | connection-ui.tsx:4134-4142 | — | same |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `const providerChoice` (3865) | never read (grep `providerChoice\b`: 1 hit) | High |
| line 3870 busy/Cancel block in provider dialog | guarded by `purpose!=='provider'` inside `purpose==='provider'` branch: always false | High |
| `cancelRecoveryReview` (2807) | 0 callers in apps/android; only slice end-marker in `test/recovery-restart-action.test.mjs:6` | High (delete with that test) |
| `saved` flag in `newConversation` (2782-2783) | written, never read | High |
| inner `testMocksEnabled&&` (4004) | already inside `testMocksEnabled?` | High |
| orphan doc comment + blank lines (2159-2165) | detached from `connectionController` | High (move, not delete) |
| `residentBrowserLogin`, `browserCloudLogin` wrappers | no app caller outside `signInBrowser`; triple-duplicated hand-off guard | High (fold into `signInBrowser`) |
| `selectCloudProvider` | one caller (3864), pure alias of `selectSavedProvider('cloud')` | High |
| `restoreSavedSignIn` + `legacySignInRecovery` + Restore button + `savedSignInRecoveryStatus`/`restoreSavedSignIn` port members + `AlphaCloudSignInPlugin.java` methods | restores a "pre-namespace legacy production credential"; package renamed 2026-11-10 with empty private data (D1) | Medium (owner confirm) |
| legacy migrations in `initialize` (`migrateLegacyMock`, `migrateLegacyHostedSelection`, staging `CLOUD_SERVICE` scrub, per-start Cloud key scrub) | data from earlier builds; D1 | Medium |
| `hosted` object, `pairedRequest`, 10 hosted controller wrappers, pairing + dev Cloud JSX | PRD "No hosted-agent pairing"; wrappers have 0 callers outside file; only test-mocks reach them | Medium (D5: move to dev until hosted e2e harness retired, then delete) |
| test-mocks Android Cerebras form (4044-4045) + `confirmRemove` state | duplicates `OwnKeyForm`/`ProviderKeys`; test-mocks only | Medium (check `local-provider-settings.spec.ts`) |
| legacy text envelope branch in `send` (3429-3434, 3441 `alphaPhone` metadata) | only test-mocks builds send it to un-negotiated (hosted/remote) peers | Medium (after hosted removal) |

## Cross-file actions
1. **Hosted path to dev, then delete** (D5). Files: `connection-ui.tsx` (part 1 :613-1192, :1527-1592, :2055-2126; part 2 items 8/9), `cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx`, `development-cloud-agents.ts`, `remote-protocol.ts`, `paired-voice.ts`, `prototype/voice-adapter.ts`, `native-reading-voice.ts`; tests `test/browser/hosted-harness.ts`, `connection-boundaries.production.spec.ts`, `flag-off-android.ts`, `browser-voice-registration.spec.ts`, `test/legacy-hosted-selection.test.mjs`, `test/ci-emulator-evidence.test.mjs`, `scripts/owner/emulator-campaign-check.ts`, `specs/quint/refinement/application/hosted-digest-refresh.mjs`.
2. **Legacy saved sign-in removal**: `connection-ui.tsx` (snapshot field :120, 2826-2844, 3669-3674, 3880), `runtime/cloud-sign-in.ts:44-50`, `android/.../AlphaCloudSignInPlugin.java:25,90` (+ `restoreSavedSignIn`), `android/app/src/androidTest/assets/video-account-fixture.js:20`, `test/native-recovery-admission-order.test.mjs`, `test/browser/saved-signin-retry.production.spec.ts` (verify which "saved sign-in" it covers: the resident `residentSavedCredential` retry must stay).
3. **Make `CloudSignInPort` members required** (`cancelGoogleSignIn`, `resumeMfa`, `addListener` on native): `runtime/cloud-sign-in.ts`, `runtime/native-connection.ts:29`, `connection-ui.tsx` 2827/2833/2907/3054/3597-3599; check upstream `NativeCloudSignInPort` in `.eliza/client-features` (upstream follow-up per D14 if the optionality is upstream's).
4. **Shared types**: `OpenThread` (`prototype/sms-adapter.ts`, `runtime/telephony-executor.ts`, `connection-ui.tsx:2283`, `main.tsx:185`), `PairedVoiceBinding` (`paired-voice.ts`, `connection-ui.tsx:2531`), `AutomationsClientBinding` (`prototype/automations-adapter.ts:17,62`, `connection-ui.tsx:2460`).
5. **Shared UI helpers**: `trapFocus` (`modal-inert.ts`, `connection-ui.tsx`, `hosted-digest-ui.tsx`, `browser/domain-recovery.ts`, `prototype/subview-accessibility.ts`); `<Icon>` (all `data-alpha-icon` users); `formatShortDate` (`connection-ui.tsx`, `settings-adapter.ts`, `cloud-membership-ui.tsx`).
6. **`captureConversationChoice` sync/async union** (`conversation-selection.ts:24` and callers in `connection-ui.tsx` 2219, 2303, 2307, 2779): give Android a separate sync reader.
7. **Dev-profile chooser extraction** (`connection-ui.tsx` 3680-3688, 3752-3773, 4016-4035, 2788-2790, 2583-2587, 3311-3322; `development-*` modules; `scripts/audit-production-bundle.ts` expectations; `dev-connection-*.spec.ts`).
8. **`connection-ui.tsx` split**: must first delete or port the T2 slicers (≈23 `connectionController`-anchored host tests, ≈11 Quint refinement harnesses) and update `specs/quint/application/manifest.json` (72 path refs) and `specs/quint/native/manifest.json` (:539, :1347), plus `test/support/feature-parity.mjs:9-16`.

## Text/path pins
- Slice markers inside this range:
  - `export const connectionController`: 23 files
  - `async send(`: 19, incl. `specs/quint/refinement/application/composer-send.mjs`, `observation-turn-dispatch.mjs`, `services/mms-compose-replay.mjs`, `services/sms-send-replay.mjs`
  - `const hosted`: 8
  - `export function ConnectionChooser`: 6
  - `productionCloudSignInRequired` / `explicitSignedOutCloudEntry`: 8 each
  - `async beginSignIn`: 5
  - `recheckPlanOnReturn`: 5, incl. `cloud-plan-recheck.mjs`
  - `async cancelSignIn`: 4
  - `residentPlanSettings`: 4, incl. `cloud-connection-notices.mjs`
  - `async initialize`: 4
  - `async residentRedeem`: 3, incl. `services/plan-admission-ports.mjs`
  - `function ResidentRecoveryPanel`: 3
  - `async configureLocal`: 2
  - `function OwnKeyForm`: `test/chooser-direct-entry.test.mjs`
  - `function OwnProviderChoice`: `test/direct-provider-module-budget.test.mjs`
  - `async restartRecovery` / `cancelRecoveryReview()`: `test/recovery-restart-action.test.mjs`
  - `getAutomationsClient`: 7, incl. browser workflow specs
- Manifests: `specs/quint/application/manifest.json` (72 path refs), `specs/quint/native/manifest.json:539,1347`; `test/support/feature-parity.mjs:9-16`.
- Comment strings that also appear in other files: "owner directive 2026-10-14" (`scripts/audit-production-bundle.ts`, `test/agent-always-local.test.mjs`, `test/browser/helpers/native-cloud-signin.ts`), "(#406)" (`scripts/audit-production-bundle.ts`). Check whether any is a text anchor before stripping it (A8).

## New patterns
- NEW-keep (security): the entered-key leak scrub at 2716 (12-character sliding window over `error.message`). It looks like defensive noise but is a required property. Extract it into a named helper; do not delete it.
- NEW: **contradictory nested guard**. A branch condition re-tests the negation of its enclosing branch, so the block is silently dead (3870). It is worth a grep across other large JSX files.
- NEW: **slice-anchor-only member**. A method kept alive only because a T2 test uses its signature as the end marker of a slice (`cancelRecoveryReview`). A sub-case of D7. Deleting T2 tests may orphan such members, so re-grep after the T2 purge.

## Owner questions
- Can the "Restore saved sign-in" path (restoring the pre-namespace legacy production credential via `AlphaCloudSignInPlugin.savedSignInRecoveryStatus`/`restoreSavedSignIn`) be deleted, given the 2026-11-10 package rename with empty private data?
- Is the test-mocks Android Cerebras key form in the generic chooser (4044-4045) still needed, or does `OwnProviderChoice` cover the same e2e paths (`local-provider-settings.spec.ts`)?
- Should the browser Cloud sign-in hand-off (`signInBrowser`, "Browser sign-in (diagnostic)") stay as a dev capability under D6, or go with the hosted path under D5?
