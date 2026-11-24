# C-app-21 ledger (runtime cloud-* files, connection-ui.css)

Skipped files (deleted by an earlier stage): `cloud-personal-intent.ts`, `cloud-personal-protocol.ts`,
`cloud-personal-setup.tsx`. Not edited: `cloud-deployment.generated.ts` (generated, checked by
`scripts/cloud-deployment.ts --check`), `cloud-environment-selection.ts`, `cloud-voice-limit.ts` (see Skipped).

## Done

- `apps/app/src/runtime/cloud-protocol.ts`
  - B1: `object` now `expectRecord(value, invalidResponse)` (export kept: `scripts/test-google-calendar-protocol.ts`);
    `string`/`uuid`/`timestamp` un-exported one-liners over `expectString`/`expectUuidRfc`/`expectTimestamp`
    (same regex, same error); local `delay` deleted, imported from `lib/abort.ts` (identical per B1 map).
  - A7: deleted `ObjectValue` (callers use `Record<string, unknown>`), `membershipBalance()` (0 callers),
    `googleCalendarFeed()` (no product caller), `initiateGmail()` (no product caller; product consent is
    `requestGoogleAuthorization`), `gmailStatus()` (no product caller), the `GoogleCalendar*` and `GoogleConnection`
    type re-exports (0 importers), and the now-unused imports (`parseManagedGoogleCalendarFeed`,
    `gmailConsentCapabilities`, `GmailGrantRequest`, google-reader types).
  - D4: one `CloudCallOptions` type shared by `call()` and `requestData()` instead of two copies of the options bag.
  - B2: `signIn` port and `signInStep` typed with `AlphaCloudSignInPlugin` (`native/alpha-cloud-sign-in.ts`).
  - A8: dropped issue/contract history from comments ("Contracts inspected in…", "issue #410", "#412",
    "elizaOS/eliza#35908").
- `apps/app/src/runtime/cloud-sign-in.ts`: B2 `CloudSignInPort` = `AlphaCloudSignInPlugin` (name kept for
  `native-connection.ts` and `scripts/test-cloud-protocol.ts`); A7 local alias `CloudSignInFailureCode` removed
  (uses `NativeCloudSignInFailureCode`); A8 header lost "owner directive 2026-10-14, #410"; unused
  `NativeCloudSignInPort` import removed.
- `apps/app/src/runtime/cloud-sign-in-ui.tsx`: A7 un-exported `SIGN_IN_SENDING`, `SIGN_IN_SIGNING_IN`,
  `SIGN_IN_BROWSER` (0 importers; the state test defines its own literal).
- `apps/app/src/runtime/cloud-voice.ts`: B2 inline 15-method `AlphaVoiceCloud` generic and local
  `VoiceClip`/`VoiceRecordingStopped`/`SpeechRecordingInput` replaced by
  `AlphaVoiceCloudPlugin & AlphaVoiceCloudBrowserMethods` and type imports from `native/alpha-voice-cloud.ts`.
  One-line import fixes in importers: `prototype/voice-adapter.ts` (`VoiceRecordingStopped` now from the native
  module, merged into its existing `VoiceClip` import) and `browser/voice.ts` (`SpeechRecordingInput`).
- `apps/app/src/runtime/cloud-delegation-ui.tsx`: B2 `delegationNative` typed
  `Pick<AlphaConnectionPlugin, …>` (registration kept: web factory exists); `any` narrowed in the revocations
  filter; C5 one `revoke(id)` shared by the grant Revoke button and the pending-disconnect retry row (same
  calls, copy and order; grant button still clears `grantId` on confirmation and calls `onConnected`).
  The `delegationCancelStep` slice region and the `cancelPending` text the replay regexes pin are unchanged.
- `apps/app/src/runtime/cloud-membership-ui.tsx`: D8 imports moved above code; A8 removed dates/issue numbers.
- `apps/app/src/runtime/cloud-membership-ui.css`: A7 deleted rules with no element (`.alpha-membership-actions`,
  `.alpha-membership-footer` ×2, `.alpha-billing-review` ×5 incl. the `:has(.alpha-billing-review)` rule,
  `.alpha-account-cancel` rule and its selectors in two grouped rules). Verified by `git grep` over apps, android,
  scripts, test, specs (no template-built class names).
- `apps/app/src/runtime/connection-ui.css`: A7 deleted `.alpha-auth-body` and `.alpha-provider-confirm` rules
  (no element).
- `apps/app/src/runtime/cloud-service-info.ts`: five `throw Error('Service information unavailable')` → one
  `fail()`; kept import-free because `node scripts/cloud-readiness.ts` and `test/cloud-service-info.test.mjs`
  load it with plain Node type stripping.

## Tests and scripts changed

- `scripts/test-cloud-protocol.ts` (behavioural): removed the `initiateGmail`/`gmailStatus` cases, their
  synthetic `/connect/initiate` and `/google/status` routes, and the matching words of the PASS line.
- `scripts/test-google-calendar-protocol.ts` (behavioural): removed the `googleCalendarFeed` and `initiateGmail`
  cases and the feed/calendars fixture; kept the `initiateGoogle` consent, bad-URL and managed-route cases.

## Deleted tests and formal artefacts

None.

## Pins left broken

- Quint manifests list these files as sources (`specs/quint/{application,services,native,legacy}/manifest.json`);
  symbol names they name (`CloudDelegationPanel`, `delegationCancelStep`, `recover`, `cancelPending`,
  `releaseCallback`, `signInFailureMessage`, `CloudSignInPanel`, `submitCode`, `stale`, …) are unchanged. If
  `quint:prepare-history` hashes source text, `cloud-protocol.ts`, `cloud-delegation-ui.tsx`,
  `cloud-membership-ui.tsx`, `cloud-voice.ts`, `cloud-sign-in(-ui)`, `connection-ui.css` need a rehash (not run).
- `test/browser/helpers/one-calendar.ts` fake still defines `googleCalendarFeed` (harmless extra member).

## Skipped

- Q-HOST-8 (Open): dev subclass for `login`/`handOffLogin`/`revokeReplaced`, Google committed-cancellation path,
  `acceptsReferences`/`clearIfCurrent`, `cancelGoogleSignIn?` on the port. Also the double
  `cloudSignInHandOffAvailable` check + `else{}` in `handOffLogin`: it lets Vite fold the hand-off body out of
  product bundles (audit-production-bundle).
- Q-HOST-9 (Open): `transcribeDevelopmentCloudRecording`/`synthesizeDevelopmentCloud` and the `developerSpeech`
  arms / dev branch of `speakCloudText` in cloud-voice.ts.
- Q-HOST-5 (Open): scope of the delegation panel; only in-file cleanup done.
- Q-UI-19 (Open): "Plan" and "Add funds" both opening billing.
- Q-BUILD-4 (Open): moving `cloud-deployment.generated.ts`.
- `cloud-protocol.ts` `void this.authority` (NEW-getter-as-guard): `signInStep` text is sliced and executed by
  `test/fixtures/google-cancel-boundary.mjs` on a receiver without `authorities`; changing it breaks a behavioural
  replay.
- `cloudEnvironmentAvailable` / `planManagementUrl` deletion or un-export: imported by
  `test/cloud-resident-authority.test.mjs`, `test/dev-surface-gates.test.mjs`, `scripts/test-cloud-subscription.ts`;
  the predicate consolidation (cross-file action 5) needs `connection-ui.tsx` and a Lemma regen.
- `safeMailLink` re-export: still imported by `scripts/inbox-adapter-fixture.ts`, `scripts/test-gmail-mailbox.ts`.
- Gmail pass-through → public `gmail` client, `initiateGoogle*` wrapper collapse: need edits in importers owned by
  others (google-accounts.ts, inbox adapters, Playwright fakes).
- `CloudAuthority = typeof productionCloud`: literal `as const` types of the two deployments are not mutually
  assignable; would need a mapped type, no gain.
- cloud-sign-in.ts rename re-exports (`authenticated`, `normalizeSignInCode`, …): callers in `connection-ui.tsx`.
  `signInFailureMessage` keyed on code instead of upstream copy: the upstream `default` arm covers several codes,
  not only `unavailable`, so the change is not behaviour-identical.
- cloud-sign-in-ui.tsx `phase` prop, field-record refactor: need `connection-ui.tsx`; formatting only otherwise.
- cloud-voice.ts: `serviceNameNow` and `noteLimit` try/catch kept (transplant sandboxes in ~10 tests provide
  partial `connectionController` objects; not verifiable as dead here); "Older bridge builds" catch kept
  (`test/diagnostics-export.test.mjs` asserts `null` for a bridge without the method); copy table and fences
  (C4) left to the shared-helper stage.
- cloud-delegation-ui.tsx: inline styles → CSS classes (D12) and the D10 status table need a visual check;
  `.catch(()=>null)` on `addListener` and the mixed `clearDelegationCallback` catch policy change error
  behaviour (uncaught clears end in "Unconfirmed").
- cloud-membership-ui.tsx: `fundingRefusedReply` → constant (connection-ui.tsx and a regex in
  `test/subscription-entitlement.test.mjs`); props-type extraction and long-line splitting are formatting.
- CSS: undefined `--connection-muted`/`--connection-border` tokens (visible dark-mode change), overridden
  declarations, scrim geometry merge, `!important` removal, segmented duplicate, `--alpha-touch-min`, status
  atoms split: all need a visual check or a file split (stage F).
- cloud-voice-limit.ts `record` → `asRecord`: left; low value and the file is evaluated directly by the dev
  bridge/tests (header note). cloud-environment-selection.ts return type: Lemma-verified signature.

## Verification

- `npx tsc --noEmit`: one error, in `apps/app/src/runtime/view-navigation.ts:253` (not owned, not caused by this
  unit); none in owned files or in `voice-adapter.ts`/`browser/voice.ts`.
- `node --import tsx scripts/<x>.ts` PASS for: test-cloud-protocol, test-google-calendar-protocol,
  test-gmail-mailbox, test-cloud-subscription, test-cloud-voice-flow, test-cloud-voice-cancellation-flow,
  test-inbox-cloud-flow (9 pass, 0 fail).
- `node --test` per file (240 s cap each; the machine was loaded by other units' suites, a combined run timed
  out): pass with 0 failures: quint-delegation-receiver, cloud-delegation-callback, cloud-sign-in-network,
  cloud-phone-login, cloud-sign-in-state, cloud-service-info, cloud-membership-ui, cloud-membership-presentation,
  subscription-entitlement, voice-start-failure-copy, read-aloud-direct, development-cloud-voice, cloud-voice-limit,
  native-google-port-capability, google-native-mfa.
  - connection-step-contracts: timed out at 240 s (not diagnosed; its delegation slice region is unchanged).
  - google-cancel-boundary: 14 fail, `ReferenceError: isRecord is not defined`: the test's vm sandbox evaluates
    `browser/cloud-connection.ts`, which another unit migrated to `lib/parse` `isRecord`; the sliced
    `cloud-protocol.ts` `signInStep` is unchanged by this unit. Not caused here.
  - notice-owner-startup: 4 fail, `window is not defined` (connection-ui.tsx transplant; not caused by this unit,
    whose only change there is a type alias in cloud-sign-in.ts).
- Not run: full `npm run verify`, build, `audit:bundle`, Playwright, Quint/Lemma checks, Android build.
