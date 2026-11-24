# Chunk test-03: host tests `appearance-preference` … `browser-cloud-dev-bridge` (20 files)

Per-file reports: `docs/simplification-audit/files/test/<name>.md`. All 20 were read in full; one
(`assistant-settlement-delivery.test.mjs`) was deleted by a concurrent cleanup agent during the review and has a short
report. `browser-calendar-series.test.mjs` and `test/fixtures/browser-daily-stores.mjs` were edited concurrently (the
`syncRecurrence` assertions went with `calendar-sync-fields.ts`); the edited test passes (3/3).

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| appearance-preference.test.mjs | 50 | transplant fixture + Quint refinement call | DELETE | `journeys/settings.spec.ts` (query override, production); Quint already in the application refinement aggregate |
| archive-scan.test.mjs | 51 | tooling (Python) | DELETE (with `scripts/scan-archived-apks.py`) | owner question |
| assetlinks-cloud-config.test.mjs | 180 | tooling, release-gating | KEEP + MERGE | `test/release/assetlinks.test.mjs` |
| assistant-draft-dispatch.test.mjs | 207 | source-text + transplant + upstream unit | DELETE | 4 cases → `journeys/chat.spec.ts`; controller tests are an upstream follow-up |
| assistant-settlement-delivery.test.mjs | (220) | transplant (already deleted) | DELETE (done) | 4 cases → `journeys/chat.spec.ts`, 1 → `journeys/voice.spec.ts` |
| auth-callback-manifest.test.mjs | 50 | tooling, release-gating | MERGE | `test/release/assetlinks.test.mjs` |
| auth-copy-native-cutout.test.mjs | 37 | transplant (legacy sign-in recovery) + CSS | DELETE | with renderer `restoreSaved`/`legacySignInRecovery` |
| automation-completion.test.mjs | 21 | unit (real import) | MERGE | `test/integration/automations.test.mjs` |
| automations-transport.test.mjs | 64 | integration | MERGE cases 3-4; DELETE cases 1-2 | `test/integration/automations.test.mjs`; cases 1-2 go with `development-cloud-agents.ts` |
| automations-unified.test.mjs | 293 | protocol integration + adapter transplant + source-text | split: MERGE / REWRITE / DELETE | protocol → `test/integration/automations.test.mjs`; 7 cases → `journeys/workflows.spec.ts` |
| avatar-initials-audit.test.mjs | 38 | tooling, release-gating | MERGE | `test/production-bundle-audit.test.mjs` |
| batch-ack-shell-retirement.test.mjs | 43 | transplant (research said A; it is C) | DELETE | 1 case → `journeys/voice.spec.ts` |
| batch-progress-stream.test.mjs | 1 | indirection to `scripts/test-*` | DELETE wrapper, MOVE target | `test/integration/voice-progress.test.ts` |
| batch-voice-progress-ack.test.mjs | 1 | indirection to `scripts/test-*` | DELETE wrapper, MERGE target | `test/integration/voice-progress.test.ts` |
| browser-bookmark-startup.test.mjs | 87 | transplant | DELETE | 1 case → `journeys/browser.spec.ts` |
| browser-calendar-open-source.test.mjs | 40 | transplant (dev scope + legacy authority) | DELETE | none (owner: `displaySources` fallback) |
| browser-calendar-series.test.mjs | 52 | integration (bundled real browser Calendar) | MERGE | `test/integration/browser-daily.test.mjs` |
| browser-camera-storage.test.mjs | 202 | bundled real module on a hand-written IndexedDB | REWRITE | 4 cases → `journeys/camera-photos.spec.ts` |
| browser-clock.test.mjs | 65 | integration (bundled real Clock/Daily) | MERGE | `test/integration/browser-daily.test.mjs` (+1 assertion to the clock journey) |
| browser-cloud-dev-bridge.test.mjs | 1206 | integration (real bridge, real HTTP) | KEEP, split | `test/integration/connection-cloud/{bridge-auth,bridge-google,bridge-services}.test.mjs` |

Counts: DELETE 9 (including the already-deleted file), KEEP 2, MERGE/REWRITE/split 9.

## Behaviours that lose all coverage if the DELETEs land without replacements

These need the named journey or integration cases written before (or in the same change as) the delete:

1. **Composer draft safety**: a refused send puts the text back with no notice line; a restart during a send offers the
   message for review instead of restoring it as a draft; an account switch never opens the new owner's draft over the
   old owner's text (`assistant-draft-dispatch`). The `assistant-draft-*.spec.ts` specs cover storage and review but
   I did not confirm they cover the refused-send and restart-during-send cases.
2. **Reply settlement**: exactly one user row and one reply row when a saved delivery and the transport reply race;
   a late reply after a conversation switch is dropped (`assistant-settlement-delivery`, already deleted, so this
   is uncovered **now**).
3. **Workflows unknown-outcome lock**: an unconfirmed mutation stays locked across reload until "Allow another" is
   confirmed; 429 vs unknown on new prompts (`automations-unified` adapter half). Check the `dev-workflow-*.spec.ts`
   specs before writing new ones; none of the names suggest this case.
4. **Voice acknowledgement Stop**: the mic stays closed until acknowledgement playback cleanup settles, and a failed
   cleanup blocks restart, at shell level (`batch-ack-shell-retirement`). The state machine itself stays covered by
   the moved `test-batch-voice-progress-ack.ts`.
5. **Browser bookmark startup failure** quiet outside Browser, reported inside (`browser-bookmark-startup`).
6. **Photos video copy + permanent delete keep bytes and row together**; abandoned edit receipts swept
   (`browser-camera-storage`). `browser-camera.spec.ts` covers capture and reload only.

## Shared helpers worth keeping

- `test/fixtures/browser-daily-stores.mjs` (6 importers; bundles the real `apps/app/src/browser` Calendar/Daily/Clock
  with only device edges stubbed). This is the pattern to copy for integration tests of browser-host modules. Rename to
  `test/support/browser-daily.mjs`, and load it once per integration file.
- `test/fixtures/browser-reminder-clock.mjs` (used by `browser-clock` and the Quint harness `browser-reminder-orphan.mjs`).
- The `fixture()` / `claim()` / `googleReady()` / `wholeGoogleStackFixture()` builders in `browser-cloud-dev-bridge`
  → one `test/support/cloud-bridge.mjs`.
- `scripts/fixtures/local-agent-stream.ts` → `test/support/` when the voice-progress suites move.
- `test/fixtures/appearance-preference.mjs` survives only for `specs/quint/refinement/application/appearance-preference-admission.mjs`; it goes once that harness is ported (T10).
- `test/support/attachment-restoration.mjs` survives only for `test/notes-owner-retirement.test.mjs`.

## Cross-file actions

- **Unset env knobs (T9)**: `ALPHA_SETTLEMENT_SOURCE_ROOT`, `ALPHA_ACK_AGENT_SOURCE`, `ALPHA_ACK_HOST_ROOT`,
  `ALPHA_ACK_VIEW_SOURCE`, `ALPHA_BROWSER_ADAPTER_SOURCE`: grep over `scripts`, `.github`, `package.json`, `test`,
  `specs` finds readers only, never a setter. Remove everywhere (`ALPHA_BROWSER_ADAPTER_SOURCE` is read by 5 tests;
  `ALPHA_ACK_HOST_ROOT` also by `scripts/test-batch-progress-stream.ts`).
- **Renderer legacy sign-in recovery**: `connection-ui.tsx` still has `const restoreSaved=` and 4 `legacySignInRecovery`
  hits although `LegacyCloudRecovery.java` is gone; delete with `auth-copy-native-cutout.test.mjs`.
- **`browser-camera.ts:41-45`**: in-row recording migration on IndexedDB upgrade is an A1 legacy reader; keep store and
  index creation only.
- **`settings-adapter.ts` `// calendar-settings:begin/end`** markers existed for the deleted settlement test (D7).
- **`data-adapter.ts` `openView` wrapper** swallows a throwing `displaySources()`/`retry()` (B1); decide with its reviewer.
- **`managed-service-routes.ts:19-20`** (`sync-v1` routes): the page-side `request` path lost its only renderer caller
  with `calendar-sync-host.ts` (D4); the resident agent path (`browser-cloud-resident.ts`) and Android still use the routes.
  Confirm whether the page-side admission still needs them.
- **D13**: `auth-callback-manifest.test.mjs` imports `vendor/eliza/packages/app/scripts/lib/android-manifest-facts.mjs`
  directly; route it through the same import `verify-apks.ts` uses.
- **Upstream follow-ups (D14)**: unit cases of `DurableDraftController`/`compareExchangeDraftStore` and
  `reminder-presentation.ts` belong in `vendor/eliza`, not here.
- **Self re-exec under tsx** (`browser-cloud-dev-bridge.test.mjs:10`): remove with the shared loader fix the research lists for 24 files.
- **Quint duplication**: `appearance-preference.test.mjs:45-50` re-runs a refinement that
  `specs/quint/refinement/application/index.mjs:56` already runs.

## Owner questions

1. Is `scripts/scan-archived-apks.py` (provider-key scan of archived APKs, needs `~/.config/alphaphone/cerebras-key`) still run by hand? If not, delete it with `archive-scan.test.mjs`; if yes, move the check into `verify-apks.ts` as an optional `--secret-file` input.
2. Should Calendar keep opening when its source list throws (the `data-adapter.ts` catch tested by `browser-calendar-open-source`)? That decides between a journey case and deleting the catch.
3. Does the page-side Cloud `request` operation still need to admit `sync-v1` Calendar routes now that the client-side Calendar sync stack is gone?
