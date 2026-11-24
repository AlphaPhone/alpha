# Chunk app-21 — runtime cloud-* files and connection-ui.css

Per-file reports: `docs/simplification-audit/files/apps/app/src/runtime/<file>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/cloud-delegation-ui.tsx | SIMPLIFY | 409 | ~280 |
| apps/app/src/runtime/cloud-deployment.generated.ts | KEEP (optional MOVE to `src/generated/`) | 5 | 5 |
| apps/app/src/runtime/cloud-environment-selection.ts | SIMPLIFY | 25 | ~22 (absorbs one predicate) |
| apps/app/src/runtime/cloud-membership-ui.css | SIMPLIFY | 76 | ~55 rule-lines |
| apps/app/src/runtime/cloud-membership-ui.tsx | SIMPLIFY | 74 | ~75 (formatted; logic smaller) |
| apps/app/src/runtime/cloud-personal-intent.ts | DELETE | 33 | 0 |
| apps/app/src/runtime/cloud-personal-protocol.ts | DELETE | 95 | 0 |
| apps/app/src/runtime/cloud-personal-setup.tsx | DELETE | 14 | 0 |
| apps/app/src/runtime/cloud-protocol.ts | SIMPLIFY + SPLIT dev hand-off | 626 | ~330 |
| apps/app/src/runtime/cloud-service-info.ts | MOVE to `scripts/lib/` | 23 | 0 here (~20 in scripts) |
| apps/app/src/runtime/cloud-sign-in-ui.tsx | SIMPLIFY | 136 | ~125 |
| apps/app/src/runtime/cloud-sign-in.ts | SIMPLIFY | 74 | ~25 |
| apps/app/src/runtime/cloud-voice-limit.ts | KEEP (minor) | 67 | ~64 |
| apps/app/src/runtime/cloud-voice.ts | SIMPLIFY | 177 | ~120 |
| apps/app/src/runtime/connection-ui.css | SIMPLIFY + SPLIT status atoms | 231 | ~200 (+~30 in `status-ui.css`) |
| **total** | | **2065** | **~1320 in renderer** (≈745 removed or moved out; plus ~120 dependent lines in `connection-ui.tsx` for the personal path) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `object` / `ObjectValue` | helper/type | cloud-protocol.ts:123 | cloud-personal-protocol.ts:20 `obj`, cloud-service-info.ts:4 `row`, cloud-voice-limit.ts:13 `record`, automations-protocol.ts:22, local-agent.ts:163, agent-calendar.ts:25 (+~30) | `apps/app/src/lib/parse.ts` |
| `string`, `optionalString` | helper | cloud-protocol.ts:128,132 | cloud-personal-protocol.ts:21 `str`, cloud-service-info.ts:8 `text`, local-agent.ts:176, diagnostics-export.ts:128 | `lib/parse.ts` |
| `uuid` | helper | cloud-protocol.ts:133 | cloud-personal-protocol.ts:22 `id` (same regex), UUID regex C3 list | `lib/parse.ts` |
| `timestamp` | helper | cloud-protocol.ts:138 | cloud-voice-limit.ts:28 `isoInstant` (stricter; keep separate) | `lib/parse.ts` |
| `delay` | helper | cloud-protocol.ts:143 | abortable sleep (C3) | `lib/abort.ts` or dev subclass |
| `sameCloudCredential` | helper | cloud-protocol.ts:71 | inline copies cloud-protocol.ts:486, 527/531 | keep, reuse |
| `CloudAuthority` | type | cloud-protocol.ts:31 | shape of `productionCloud` in cloud-deployment.generated.ts:2 | `typeof productionCloud` |
| `CloudEnvironment` literal | type | cloud-protocol.ts:30 | cloud-environment-selection.ts:11 return type | cloud-protocol.ts |
| `cloudEnvironmentAvailable` / `cloudEnvironmentAllowed` / `resolveCloudEnvironmentCore` | helper | cloud-protocol.ts:52; connection-ui.tsx:209; cloud-environment-selection.ts:11 | each other | cloud-environment-selection.ts |
| `CloudAgent` | interface | cloud-protocol.ts:104 | — | development-cloud-agents.ts (then delete) |
| `delegationNative` (AlphaConnection) | plugin const | cloud-delegation-ui.tsx:23 | native-connection.ts:214, mock-admission.ts:9, prototype/workflow-authoring.ts:19 | native-connection.ts |
| `native` (AlphaVoiceCloud) | plugin const | cloud-voice.ts:86 | ~16 other files (C2) | `apps/app/src/native/alpha-voice-cloud.ts` |
| `VoiceRecordingStopped`, `SpeechRecordingInput`, `VoiceClip` | type | cloud-voice.ts:83-85 | browser/voice.ts input shapes | same native module |
| `small` icon style | helper | cloud-delegation-ui.tsx:10 | hosted-digest-ui.tsx:5-9, calendar-sync-settings.ts:10-13 | CSS class |
| `DelegationStatus` | component | cloud-delegation-ui.tsx:12 | status-ui.tsx `Busy`/`StatusDot` | status-ui.tsx |
| `Pending` | type | cloud-delegation-ui.tsx:35; cloud-sign-in-ui.tsx:25 | C1 `Pending` list | rename locally |
| `SIGN_IN_SENDING/SIGNING_IN/BROWSER` | const | cloud-sign-in-ui.tsx:21-24 | literals connection-ui.tsx:747,2138,2152,2950 | replace by `phase` prop |
| `fundingRefusedReply` | helper | cloud-membership-ui.tsx:9 | literal 'Billing declined' cloud-membership-ui.tsx:66 | `BILLING_DECLINED` in subscription-entitlement.ts |
| `FUNDING_NEEDED` | const | cloud-membership-ui.tsx:7 | — | subscription-entitlement.ts |
| `money` | helper | cloud-personal-setup.tsx:5 | cloud-membership-ui.tsx:57 inline | delete with file |
| personal intent CAS | helper | cloud-personal-intent.ts:21 | media-copy-intent.ts:19-25 | delete; twin → storage port |
| account fence (`check`/`current`) | helper | cloud-voice.ts:119,166 | C4 fences (connection-ui.tsx `const current=` ×26) | shared fence helper |
| foreground gate | helper | cloud-voice.ts:166 | browser/notice-action.ts:2, browser/location.ts:11, browser/clock.ts:39, browser/hosted-results.ts:17, browser/alert-audio.ts:7 | one `ownerForeground()` |
| `row`/`text` | helper | cloud-service-info.ts:4,8 | cloud-protocol.ts:124,128 | `scripts/lib/parse.ts` |
| `record` | helper | cloud-voice-limit.ts:13 | plain-object guard ×35 | `lib/parse.ts` |
| phone-scrim geometry | CSS | connection-ui.css:1,154 | cloud-membership-ui.css:32 | one rule in connection-ui.css |
| touch-target min-height | CSS value | connection-ui.css:120,139 | cloud-membership-ui.css:10,19,25,32,71 | `--alpha-touch-min` |
| spinners `.alpha-spinner`/`.alpha-spin` | CSS | connection-ui.css:100,204 | inline-styled spinner cloud-delegation-ui.tsx:16 | status-ui.css |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx` (142 lines) + connection-ui personal state/controller/JSX | PRD "No hosted-agent pairing"/"no hosted agent"; `new CloudPersonalProtocol` only in `development-cloud-agents.ts:54` and `browser/development-cloud.ts:24`; controller methods return `pairingRetired()` when `hosted` is null | High (owner sign-off on test-mocks demo) |
| `CloudProtocol.membershipBalance` | `membershipBalance(` has no caller (grep) | High |
| `CloudProtocol.googleCalendarFeed` | callers: only `scripts/test-google-calendar-protocol.ts` and a throwing stub in `test/browser/helpers/one-calendar.ts` | High |
| `CloudProtocol.initiateGmail` | only `scripts/test-google-calendar-protocol.ts` | High |
| `CloudProtocol.gmailStatus` | only `scripts/test-cloud-protocol.ts:204` | High |
| `requestData` options `runtimeBase`, `onStatus` | 0 callers pass them | High |
| `cloudEnvironmentAvailable` | only 2 tests | High |
| `GoogleCalendar*` type re-exports, `safeMailLink` re-export (cloud-protocol.ts:109-116) | 0 importers of the calendar types; `safeMailLink` only 2 scripts | High |
| Unused type exports `CloudLoginAttempt`, `CloudLoginResult`, `CloudSessionRevocation`, `CloudSignInFailureCode`, `CloudSignInGoogleMfaRequired`, `CloudSignInActions`, `AlphaAuthBrand` (export only), `VoiceClip` | 0 importers outside their files (grep -w) | High |
| `SIGN_IN_SENDING`, `SIGN_IN_SIGNING_IN` | 0 importers; controller uses literals | High |
| `googleCalendarSync`, `googleCalendars` | used only by the client-side Calendar linked-sync stack (A2) | Medium (depends on A2 decision) |
| `savedSignInRecoveryStatus`/`restoreSavedSignIn` port members (+ connection-ui legacy recovery UI, native methods) | A1: pre-namespace credential recovery; package renamed with empty data | Medium (Android owner) |
| Dev hand-off sign-in `login`/`handOffLogin`/`delay` in product class | test-mocks / browser-resident only; move to dev subclass | High (move, not delete) |
| `transcribeDevelopmentCloudRecording`/`synthesizeDevelopmentCloud` + `developerSpeech` arms in cloud-voice.ts | implemented only by browser dev host `browser/voice.ts:231,237`; not in `AlphaVoiceCloudPlugin.java` | Medium |
| "Older bridge builds" catch in `readNativeCloudStreamTiming` | `cloudStreamTiming` ships in upstream `SpeechStreamBridgePlugin` in the same APK | High |
| CSS: `.alpha-membership-actions`, `.alpha-membership-footer`, `.alpha-billing-review` (5 rules), `.alpha-account-cancel`, `.alpha-auth-body`, `.alpha-provider-confirm` | 0 non-CSS uses in apps/app/src; no template-built `alpha-` classes | High |
| CSS overridden declarations (connection-ui.css:10, 18-19, part of 4) and duplicate segmented rule (cloud-membership-ui.css:64) | later rules in same/other file override them | Medium (visual check) |
| `cloudDelegationSlot` regex export | only `scripts/fixtures/cloud-delegation/native.ts` | High (move to fixture) |

## Cross-file actions
1. **Retire personal Cloud agent path**: delete `cloud-personal-{protocol,intent,setup}`; edit `connection-ui.tsx` (imports 45-47, `cloudPersonal` snapshot field 139, 607-656, 2064-2111, 3241-3247, 4062-4063), `development-cloud-agents.ts` (`personal()`), `browser/development-cloud.ts`, `browser/development-cloud-ui.tsx`; delete `scripts/test-cloud-personal-flow.ts`, `test/cloud-personal-protocol.test.mjs`, `test/browser/cloud-personal-onboarding.spec.ts`, `test/browser/cloud-personal-intent-storage.spec.ts`; edit `scripts/test-connection-history.ts`, `test/white-label-copy.test.mjs:35`, `test/browser/cloud-account-replacement.production.spec.ts:15,32`, `test/support/feature-parity.mjs:484-486`.
2. **Dev subclass for Cloud sign-in hand-off and browser credential references**: move `login/handOffLogin/delay/revokeReplaced`, Google committed-cancellation path, `acceptsReferences`/`clearIfCurrent` into `development-cloud-agents.ts` (`DevelopmentCloudProtocol`); edit `cloud-protocol.ts`, `cloud-sign-in.ts` (`cancelGoogleSignIn?`), `native-connection.ts` (dev store), `browser/cloud-connection.ts`, `connection-ui.tsx` (`makeCloud`, 2138, 2152, 2910); tests `test/cloud-resident-authority.test.mjs`, `test/google-cancel-*.test.mjs`, `test/native-google-port-capability.test.mjs`, `test/browser-cloud-dev-bridge.test.mjs`, `scripts/test-cloud-protocol.ts`.
3. **Shared parse helpers** `apps/app/src/lib/parse.ts`: cloud-protocol.ts, cloud-personal-protocol.ts (if kept), cloud-voice-limit.ts, development-cloud-agents.ts (uses `object/optionalString/string/uuid` from cloud-protocol), automations-protocol.ts, local-agent.ts, agent-calendar.ts and others in the C3 list; `cloud-service-info.ts` uses a `scripts/lib` twin after its move.
4. **Gmail client exposure**: make `CloudProtocol.gmail` public; edit `prototype/inbox-cloud-adapter.ts`, `prototype/inbox-provider-controls.ts`, `runtime/google-accounts.ts`, `prototype/settings-adapter.ts`, `scripts/test-gmail-mailbox.ts`, `scripts/inbox-adapter-fixture.ts`, browser fakes implementing flat `gmailX` methods (`test/browser/owner-gmail-read-state-absent.spec.ts`, `gmail-*.spec.ts`).
5. **Environment predicate consolidation**: add annotated `cloudEnvironmentAllowed` to `cloud-environment-selection.ts`; remove `connection-ui.tsx:209` and `cloud-protocol.ts:52`; regenerate `specs/lemma/.../cloud-environment-selection.dfy`; update `LemmaScript-files.txt` if names change; update `test/cloud-environment-selection.test.mjs`.
6. **Typed native plugin modules (C2)**: `AlphaVoiceCloud` (cloud-voice.ts + ~16 files) and `AlphaConnection` (cloud-delegation-ui.tsx, native-connection.ts, mock-admission.ts, prototype/workflow-authoring.ts, hosted-digest-ui.tsx); `specs/quint/refinement/application/hosted-digest-refresh.mjs` stubs `./cloud-delegation-ui` by path.
7. **Sign-in phase prop**: `cloud-sign-in-ui.tsx` + `connection-ui.tsx` (message literals 747, 2138, 2152, 2950) + `test/cloud-sign-in-state.test.mjs`.
8. **Copy constants**: `FUNDING_NEEDED` and new `BILLING_DECLINED` to `subscription-entitlement.ts`; edit `cloud-membership-ui.tsx`, `connection-ui.tsx:348,1783`, `test/subscription-entitlement.test.mjs:126,161` (T1 assertions), stubs in `connection-presentation-state`, `connection-recovery-state`, `pending-action-failure-boundary` tests.
9. **CSS consolidation**: `connection-ui.css` + `cloud-membership-ui.css` (scrim geometry, segmented, touch-min token, dead selectors); new `status-ui.css` imported by `status-ui.tsx`; update dev fixtures `scripts/fixtures/{cloud-delegation,hosted-live-source}/entry.tsx`; `cloud-delegation-ui.tsx` inline spinner/icon styles → classes; `specs/quint/refinement/application/cloud-connection-notices.mjs` reads connection-ui.css text.
10. **Owner-foreground gate** (C4): cloud-voice.ts:166 with `browser/{notice-action,location,clock,hosted-results,alert-audio}.ts`.
11. **A2 calendar stack**: deleting `googleCalendarSync`/`googleCalendars` requires `calendar-linked-provider.ts`, `calendar-sync-host.ts`, `calendar-sync-settings.ts` and their tests/specs (`calendar-linked.mjs`, 5 tests) — coordinate with the A2 chunk.
12. **Generated file relocation** (optional): `cloud-deployment.generated.ts` path in `scripts/cloud-deployment.ts:85`, `android/app/product.gradle`, 13 importers, manifests and tests listed in its report.

## Text/path pins
- `specs/quint/application/manifest.json`: cloud-delegation-ui.tsx (6907-6941: `delegationCancelStep`, `CloudDelegationPanel`, `run`, `callback`, `recover`, `cancelPending`), cloud-membership-ui.tsx (4013), connection-ui.css (2807), cloud-sign-in-ui.tsx, cloud-sign-in.ts (`signInFailureMessage`), cloud-voice.ts (`cloudVoiceServiceLimit`).
- `specs/quint/services/manifest.json`: cloud-environment-selection.ts, cloud-protocol.ts, cloud-sign-in(-ui), cloud-deployment.generated.ts. `specs/quint/native/manifest.json`: cloud-protocol.ts, cloud-voice.ts, `restoreSavedSignIn`/`savedSignInRecoveryStatus`. `specs/quint/legacy/manifest.json` + `legacy/sign-in/check-sign-in-refinement.mjs`: cloud-sign-in(-ui), cloud-protocol.
- Quint refinement harnesses: `hosted-digest-refresh.mjs:26,54` (stubs `./cloud-delegation-ui`), `cloud-connection-notices.mjs:17` (reads connection-ui.css), `account-sheet.mjs` (cloud-deployment.generated, `data-alpha-membership-panel`), `speech-cleanup-latch.mjs`, `batch-capture-completion.mjs` (cloud-voice), `gmail-agent-mailbox-recovery-probe.mjs`, `calendar-linked.mjs` (fakes `googleCalendarSync`), `google-*.mjs` (call `initiateGoogle(`).
- Lemma: `LemmaScript-files.txt:14-15` (cloud-environment-selection.ts, cloud-voice-limit.ts), `specs/lemma/apps/app/src/runtime/*.dfy(.gen)`, `specs/lemma/README.md`.
- `test/support/feature-parity.mjs:480-492` lists all 13 TS/TSX files of this chunk by path.
- Source-text/transplant tests: `test/quint-delegation-receiver.test.mjs:15-21` and `test/connection-step-contracts.test.mjs:12,140` (slice cloud-delegation-ui.tsx between `export function delegationCancelStep(` and `export function CloudDelegationPanel(`), `test/cloud-delegation-callback.test.mjs` (esbuild stubs), `test/subscription-entitlement.test.mjs:70,126,154-161` (import lists of cloud-membership-ui.tsx and cloud-voice.ts; regex on `fundingRefusedReply(cloudServiceName(cloud.environment))`), `test/white-label-copy.test.mjs:14,35` (cloud-deployment.generated path; bundles cloud-personal-setup.tsx), `test/cloud-membership-presentation.test.mjs:15`, `test/cloud-environment-selection.test.mjs`, `test/fixtures/cloud-voice-view.mjs` (+ ~40 voice tests), `test/cloud-sign-in-*.test.mjs`, `test/digest-delegation-host.test.mjs`, `test/login-surfaces.test.mjs` + `test/support/login-surfaces.mjs:100`.
- Scripts: `scripts/cloud-deployment.ts:85` writes/checks cloud-deployment.generated.ts (verify step 1); `scripts/prepare-client-features.ts:312` lists upstream `native-cloud-sign-in.ts`; `scripts/source-snapshot.ts`; dev fixtures `scripts/fixtures/cloud-delegation/*`, `scripts/fixtures/hosted-live-source/entry.tsx` import connection-ui.css and cloud-delegation-ui; `scripts/test-cloud-*.ts`, `test-gmail-mailbox.ts`, `test-google-*.ts`, `test-connection-history.ts`, `browser-cloud-dev-bridge.ts`, `cloud-readiness.ts`.
- Android: `android/app/product.gradle` (generated deployment); instrumented tests reference sign-in *copy*, not paths.

## New patterns
- **NEW-undefined-token**: CSS uses custom properties no palette defines (`--connection-muted`, `--connection-border` in connection-ui.css:148-149), so the fallback light colour always wins — dark-theme bug. Grep every `var(--x,` against the set of properties actually assigned.
- **NEW-dead-parameter**: functions that keep a signature but discard the argument (`fundingRefusedReply(serviceName){void serviceName;…}`) — replace with a constant.
- **NEW-getter-as-guard**: `void this.authority;` evaluating a throwing getter for its side effect (cloud-protocol.ts:285) — use an explicit assert.
- **NEW-css-specificity-war**: `!important` used to beat a sibling stylesheet's rules (12× in cloud-membership-ui.css) instead of merging the rules — consolidate selectors, then drop `!important`.
- (Possibly fits D10 rather than new) UI state inferred from user-visible message text (`DelegationStatus`, `CloudSignInPanel` `message === SIGN_IN_SENDING`, `signInFailureMessage` comparing upstream copy).

## Owner questions
1. May the personal Cloud agent / Dedicated-hosting path (cloud-personal-*, `hosted` personal methods, dev UI) be deleted entirely, including from test-mocks builds?
2. Can the pre-namespace saved sign-in recovery (`savedSignInRecoveryStatus`/`restoreSavedSignIn`, AlphaCloudSignInPlugin legacy credential) be removed now that the package rename starts with empty data?
3. Is the "Cloud reads" delegation panel (cloud-delegation-ui.tsx, mounted from HostedDigestPanel → HostedLiveSourcePicker on Android) in PRD scope? It is production-reachable but the PRD does not name hosted digests/read delegation.
4. Will native ever implement `cancelGoogleSignIn` (committed-cancellation Google path), or is it permanently browser-dev-host only and therefore movable to the dev subclass?
5. Should the developer Cloud/Cartesia speech routes keep their own plugin methods (`transcribeDevelopmentCloudRecording`, `synthesizeDevelopmentCloud`), or can the browser dev host implement the product methods so production code stops branching?
6. Account sheet: "Plan" and "Add funds" both open the same Cloud billing page — keep both entry points?
7. Is relocating generated files (cloud-deployment.generated.ts) into a `generated/` folder wanted, given the path churn across scripts, gradle, manifests and tests?
