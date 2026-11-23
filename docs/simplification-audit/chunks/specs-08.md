# Chunk specs-08: application Quint models ShellScreen … WorkflowRequestRecoveryAdmission

14 files, all `specs/quint/application/*.qnt`, all live (listed in `specs/quint/application/manifest.json`, which
`scripts/quint-lib.ts` validates and `scripts/check-quint.ts` runs). Every manifest `source` and symbol pin still
resolves in this worktree. Per-file reports are under `files/specs/quint/application/`.

## Files

| File | Kind | Code tie | Verdict | Note |
|---|---|---|---|---|
| ShellScreen.qnt | model | replay harness, slices `model.js` (T10) | KEEP, SIMPLIFY, PORT harness | `secure` dimension is vacuous; dies with Wallet (D2). Boot/lock/power are dev-surface simulation |
| SignInChooser.qnt | model | 15 symbol pins only | KEEP | drop symbol pins |
| SignInReadinessProbe.qnt | model | 12 symbol pins only | KEEP | drop symbol pins |
| SourceRenewalQuestion.qnt | model | esbuild bundle of real `hosted-digest-ui.tsx` with port stubs | KEEP | delete stub unit test `test/source-renewal-question.test.mjs`; run once |
| StartupPermissions.qnt | model | `portable.mjs` imports real module | KEEP, SIMPLIFY | delete `oldCompletedInstall`/`upgradeTest`/`CompletedUpgrade` (A1, D1); delete duplicate `test/quint-conformance.test.mjs:64-95` |
| StartupUpdateAdmission.qnt | model of upstream `app-update-gate.ts` | eval with text-marker injection + hash ceremony | KEEP, PORT harness | owner question: model upstream code here or upstream (P6/D14) |
| StoppedReplyReconciliation.qnt | model | 10 symbol pins only | KEEP | drop symbol pins |
| ViewAdmission.qnt | model | bundle import + two regex source asserts (T1) | KEEP, PORT test asserts | optional: drop redundant `ReportedMatchesRaw` |
| VoiceOwnedNavigation.qnt | model | harness slices `voice-adapter.ts` (T2/T10) | KEEP, PORT harness | drop trivially true `CountersBounded` |
| VoiceSurfaceRetirement.qnt | model | 10 symbol pins only | KEEP | no executable link |
| VoiceTranscriptFollow.qnt | model | harness slices `model.js` Component methods (T10) | KEEP, SIMPLIFY, PORT harness | `focus`/`noFocusChange` is inert |
| VoiceTurnReview.qnt | model | 7 symbol pins only | KEEP | no executable coverage anywhere |
| WorkflowClockAdmission.qnt | model | fixture slices `agent-adapter.ts`, `model.js`, `template.html` (T10) | KEEP, PORT harness | merge `test/fixtures/workflow-clock-admission.mjs` into the harness |
| WorkflowRequestRecoveryAdmission.qnt | model of a test-mocks-only dialog | `sourceContext` strip-and-eval of whole file | KEEP (follows code), PORT to `tsImport` | `capture` (= backup download) goes with D3; whole model goes if Q-DEV-3 deletes web recovery |

No DELETE verdicts. Model edits: ShellScreen (after Wallet deletion), StartupPermissions (legacy upgrade),
VoiceTranscriptFollow (inert variable), VoiceOwnedNavigation (trivial invariant), WorkflowRequestRecoveryAdmission
(after D3). Each such edit must update the manifest `tests`/`invariants`/`symbols` in the same commit, or
`quint-lib.ts:225-245` fails.

## Behaviours that would lose all coverage

No model is deleted here, so nothing loses formal coverage. But five models have **no executable link to the code**
(only manifest symbol pins, which T10 removes): SignInChooser, SignInReadinessProbe, StoppedReplyReconciliation,
VoiceSurfaceRetirement, VoiceTurnReview. Their implementations are covered only by host tests that the test cleanup
deletes as transplants/units (`cloud-sign-in-state`, `chooser-direct-entry`, `cloud-sign-in-late-readiness`,
`stopped-reply-outcome`, `stopped-reply-match`, `voice-owned-capture-cleanup`, `composer-send-ownership`, …).
Once those go, the journeys must carry:
- `journeys/connection-cloud.spec.ts`: email code → spent code → resend → sign in; Google wait + Back; own keys saved
  while the readiness probe runs; automatic entry probes once.
- `journeys/chat.spec.ts`: stop a reply, see the "check later"/confirmed-stop notice; a new message retires the check.
- `journeys/voice.spec.ts`: type during voice stop (message waits, then sends); failed stop keeps voice closed but
  typed messages go out; **reviewed transcript edit/send/discard** (VoiceTurnReview has no test reference at all
  today: `reviewConversationTurn` and `conversationReviewRequired` are unreferenced in `test/` and `specs/quint/refinement`).
- `journeys/home-shell.spec.ts`: image Contacts admitted/revoked on refresh (ViewAdmission's two shell rules, once
  the regex asserts go).

## Shared helpers worth keeping

- `refinement/application/support.mjs` `sourceModule`/`bundledSource` (real-module esbuild import) is the right port
  target; `sourceContext` (strip-and-eval) should be replaced by `tsImport`.
- `refinement/services/identity-comms-traces.mjs` `sourceModule(path, stubs)` duplicates `support.mjs`'s bundler
  with a stub plugin (C5); one bundling helper with optional stubs should serve both.

## Cross-file actions

1. Manifest: replace symbol pins with file pins for all 14 entries (T10); this is what blocks the `connection-ui.tsx`,
   `voice-adapter.ts` and `model.js` splits from editing formal metadata.
2. Stage F extractions the harness ports need: shell core from `model.js` (ShellScreen, WorkflowClockAdmission
   `leave`, ViewAdmission reported-view rule, VoiceTranscriptFollow scroll follow); owned-navigation factory from
   `voice-adapter.ts`; agent `context(shell)` builder from `agent-adapter.ts`.
3. Single runner: SourceRenewalQuestion, StartupUpdateAdmission, VoiceTranscriptFollow, WorkflowClockAdmission,
   WorkflowRequestRecoveryAdmission, StartupPermissions run both per-model and in
   `test/quint-application-refinement.test.mjs` (T4).
4. With D2 (Wallet): delete `secureAdmits` and the `secure` session in `model.js` together with ShellScreen's secure
   branches and pins.
5. With D1: delete walkthrough versions 1-3 in `startup-permission-progress.ts` together with StartupPermissions'
   upgrade action and the manifest `upgradeTest` entry.
6. StartupUpdateAdmission harness: drop sha256 receipts and the `appUpdateResumePatch` tombstone assert (B5, A8).

## Owner questions

- Q-DEV-3 (existing): is web Workflows request recovery deleted or moved to `dev/`? Decides whether
  WorkflowRequestRecoveryAdmission is kept or deleted with its harness and test.
- ShellScreen's boot/lock/off/power are reachable only from the development device controls (`?tools=1`) and the
  test-mocks lock frame. Keep modelling the dev screen simulation, or move it behind `dev/` and drop those
  dimensions from the model (view-timer and voice ownership stay)?
- StartupUpdateAdmission models upstream `app-update-gate.ts`: keep the consumer-side model here, or move it upstream
  with a test export for its internal state (D14)?
