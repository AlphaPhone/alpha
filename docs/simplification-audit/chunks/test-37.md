# Chunk test-37: host tests google-maps-content … image-contacts-admission (25 files)

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| test/google-maps-content.test.mjs | 132 | unit (esbuild bundles of maps modules, stub backend) | REWRITE | `journeys/maps.spec.ts` (3 cases) |
| test/google-native-mfa.test.mjs | 81 | transplant + vendor Java source-text | DELETE | 2 cases in `journeys/connection-cloud.spec.ts` |
| test/google-workspace-return-flow.test.mjs | 85 | host-JVM integration (inline Java) | KEEP case 1 → Gradle JVM `GoogleWorkspaceReturnFlowTest`; DELETE android.jar compile case | — |
| test/google-workspace-return-native.test.mjs | 93 | host-JVM unit + source-text | MERGE case 1 | `GoogleWorkspaceReturnFlowTest`; manifest/domain rules → `verify-apks.ts` |
| test/google-workspace-return.test.mjs | 62 | unit (bundled renderer modules, stub port) | REWRITE | `journeys/inbox.spec.ts` (3 Gmail-connect cases) |
| test/gradle-verification.test.mjs | 204 | tooling (release gate) + some source-text | KEEP, SIMPLIFY | `test/tooling/android-supply-chain.test.ts` (~120 lines) |
| test/history-initial-state.test.mjs | 49 | transplant (model.js, dc-lite, agent-adapter, connection-ui) | DELETE | 3 cases in `journeys/chat.spec.ts` |
| test/home-agent-navigation.test.mjs | 35 | transplant of upstream + view-navigation | DELETE | covered by `view-navigation.spec.ts` |
| test/home-calendar-selection.test.mjs | 299 | transplant (vm + require stubs) of one selector | REWRITE | `journeys/home-shell.spec.ts` (6-7 Agent Calendar cases) |
| test/home-cards.test.mjs | 319 | unit presenters + source-text + transplant | DELETE | 3 assertions in `journeys/home-shell.spec.ts` |
| test/home-google-connection-source.test.mjs | 19 | transplant | DELETE | 1 case in `journeys/home-shell.spec.ts` |
| test/home-inset-layout.test.mjs | 24 | transplant + CSS/source-text | DELETE | optional 1 case (native-insets) |
| test/home-overview-cards.test.mjs | 167 | unit render (React bundle) + `node -e` child | DELETE | covered by `home-daily-overview.spec.ts` |
| test/home-role-recovery-contract.test.mjs | 18 | Java method transplant + reflection fallback + source-text | DELETE | optional Gradle `RendererRecoveryBudgetTest` |
| test/home-shell.test.mjs | 444 | unit-with-render on fake Shell | DELETE | 3 cases in `journeys/home-shell.spec.ts` |
| test/home-views-model.test.mjs | 361 | transplant (~30 model.js slices) | DELETE | 3 cases (camera-photos, contacts) |
| test/host-speech-admission.test.mjs | 68 | tooling (release gate) + vendor source-text | KEEP, SIMPLIFY | `test/tooling/native-inputs.test.ts` |
| test/hosted-digest-mutation-ownership.test.mjs | 75 | scenarios on Quint harness (Chromium) | MERGE | `test/quint-hosted-digest-refresh.test.mjs` |
| test/hosted-digest-panel.test.mjs | 36 | unit in `node -e` child | DELETE | optional 1 case `journeys/workflows.spec.ts` |
| test/hosted-digest-refresh-ownership.test.mjs | 58 | scenarios on Quint harness (Chromium) | MERGE | `test/quint-hosted-digest-refresh.test.mjs` |
| test/hosted-native-inputs.test.py | 224 | tooling (Python, release gate) + workflow-text case | KEEP, SIMPLIFY | single Python collector |
| test/hosted-notice-question.test.mjs | 32 | unit (stubbed imports) | DELETE | covered by Quint + notice specs |
| test/hosted-notice-withdraw.test.mjs | 15 | host-JVM integration | MERGE | `hosted-result-notices` → Gradle `HostedResultNoticesTest` |
| test/hosted-result-notices.test.mjs | 15 | host-JVM integration | KEEP (merge target) | Gradle `HostedResultNoticesTest` |
| test/image-contacts-admission.test.mjs | 53 | unit + source-text | DELETE | 1 case in Contacts journey |

Totals: 13 DELETE, 3 REWRITE, 4 MERGE (incl. one partial), 5 KEEP (incl. KEEP-with-delete-case and merge target).
About 2,300 test lines removed or moved; the kept tooling files shrink by roughly a third.

## Behaviours that lose all coverage if the DELETEs land without replacements

These need the carried journey cases before (or with) the deletion:

1. Google Maps content policy: a Google-sourced place cannot be saved, cannot be used as a routing origin, and a provider
   change clears a provider-picked origin (`google-maps-content`). No browser case found.
2. Home "verified empty" Calendar rules under Agent Calendar: partial-coverage feed, unknown source in period, failed
   reread, saved rows during refresh, all-day in negative-offset zone (`home-calendar-selection`). Only the happy paths
   and failed-widget case are in `home-daily-overview.spec.ts`.
3. Chat history restore racing an owner/session switch (old owner's messages never appear) and attachment restore
   (`history-initial-state`).
4. Lock-screen camera session cannot reach Maps/Notes by any open route; switching camera mode while recording stops
   the recording (`home-views-model`).
5. Losing Contacts admission while Contacts is open returns Home (`image-contacts-admission`).
6. Home: no installed-app read until the drawer opens; failed launch toast once; favorites save error in the edit bar
   (`home-shell`).
7. Gmail Workspace return in the renderer: account switch before consume publishes nothing (`google-workspace-return`).
8. Google sign-in MFA panel shown and no account bound before verification (`google-native-mfa`) — likely partly in the
   Cloud sign-in specs; confirm before deleting.
9. Never-read stale inbox claims no count; long brief truncation; calendar name never borrowed (`home-cards`).

## Shared helpers worth keeping

- `test/fixtures/jvm-tools.mjs` (`runJvm`, `nativeSource`, `javaBinary`, `jsonJar`, `jvmSkip`): 114 importers; keep
  until JVM tests move to a Gradle `src/test` source set (none exists yet).
- `test/fixtures/native-source.mjs` (`prepareNativeFixture`, `noticeSources`): 10 importers; survives.
- `test/fixtures/HostedResultNoticesTest.java`, `HostedNoticeWithdrawTest.java`: merge into one JUnit class.
- `test/fixtures/browser-source.mjs` (`loadBrowserModule`): 16 importers; loses `google-workspace-return` here. It is the
  sanctioned bundle loader; the ~60 private esbuild loaders (here: `google-maps-content`, `home-overview-cards`,
  `hosted-notice-question`) go with their files.
- `test/support/strip-types.mjs`: loses three importers here (`history-initial-state`, `home-agent-navigation`,
  `home-inset-layout`); delete once the transplant tests are gone.

## Cross-file actions

- Create the Android Gradle JVM test source set (`android/app/src/test/java/...`, JUnit + `org.json`) and move
  `GoogleWorkspaceReturnFlowTest` and `HostedResultNoticesTest` there; run them in the Android lane, not `npm test`.
- `verify-apks.ts`: add the merged-manifest check for the single `/alphaphone/gmail/callback` App Link filter on the
  build's host (replaces source-text case in `google-workspace-return-native`).
- Make `npm run android:deps:check` a step of the Android lane or `verify`; today only `gradle-verification.test.mjs`
  runs `checkVerification` in CI.
- Quint chunk: PORT `specs/quint/refinement/application/hosted-digest-refresh.mjs` (text marker
  `\tconst mounted = useRef(true);`, ~25 stubbed relative specifiers) and fold the six ownership scenarios into its one
  runner, so Chromium launches once instead of three times.
- Product deletions that delete tests here: Wallet (`home-views-model` `walRestoreCard`/`secureAdmits('wallet')`),
  `nativeGoogleWorkspaceReturnAvailable` (B283), `digestToggledSpec` and phase-less pending records (B297/B298),
  favorites view-id migration in `home-shell.ts` (A1), legacy Google saved-place rows in `SavedPlaces` (A1),
  `RendererRecoveryBudget.onLoss` old-signature fallback, removed `--runtime-profile` refusal and the historical AAPT2
  producer string in `gradle-verification.ts` (A8), 1-arg `HostedResultNotices.capture` (B36) — update the Java fixtures.
- Python: run `hosted-native-inputs.test.py` from the one Python collector in a path-filtered lane
  (`scripts/ci/**`, `android/*-host/**`) instead of the bespoke `resident-android.yml:198` step.

## Owner questions

1. `gradle-verification.test.mjs` "AAPT2 provenance retains the historical producer": may the metadata's
   `…scripts/gradle-verification.mjs` origin string be rewritten (one reviewed `--write`) so the compatibility case can go?
2. `host-speech-admission.test.mjs`: can upstream export the Paradee/Phonon/VAD asset arrays so the drift check imports
   them instead of parsing `vendor/eliza` source text (D14 follow-up)?
3. Does the lock-screen secure camera containment (no route from the camera to Maps/Notes) need a journey, or is it
   covered by device acceptance only?
4. Is the dialer in `model.js` (`pn*` functions) a shipping surface? If yes it needs a telephony journey; the cases in
   `home-views-model` were its only host coverage seen here.
