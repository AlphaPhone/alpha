# D-gate2: final gate after the review fixes

Tree: `claude/codebase-simplification` at `d3a290675` plus the uncommitted review fixes (`ledger/D-fix-*.md`) and the
`MERGE-gate.md` edits, worktree `.claude/worktrees/simplify`, 21 Nov 2026. Load average was about 150 for the whole
run (other agents' Quint and tsc jobs). Nothing here is an APK build, an emulator run, an image boot or a device
check. No git command that writes was run; nothing is committed. `vendor/`, `.eliza/` and `upstream.lock.json` were
not touched.

## 1. Gates

Run after the last fix ledger was written; no product or script source changed afterwards.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0, no diagnostics |
| `bun run typecheck:scripts` | "Script typecheck passed", exit 0 |
| `bun run build:only` (`vite build`) | exit 0, "built in 10.48s" (two `INEFFECTIVE_DYNAMIC_IMPORT` warnings, reminder documents) |
| `bun run audit:bundle` | `PASS web-dist: 416 files, testMocks=false, no audited mock, fixture or developer markers found.`, exit 0 |

The audit script was not edited. Its licence flags are the reported, non-blocking ones.

## 2. Host tests for the files the fix ledgers changed

Selection (88 files): every `test/*.test.mjs` that is itself changed in the working tree, every test file a
`D-fix-*` ledger names, and every test file that names the basename of a changed source, spec, harness or fixture
file. 47 are ordinary host tests, 41 are `test/quint-*` wrappers. Each file ran in its own runner process:
`ALPHA_TIMEOUT_SCALE=4 ALPHA_TEST_CONCURRENCY=1 bun scripts/run-tests.ts <file>`, five files at a time.

First pass: 80 files exit 0, 8 files exit 1; 524 cases pass, 8 fail (one failing case per failing file). The table
at the end has every file.

Also run: `bun scripts/test-clock-handoff-flow.ts`: PASS, exit 0.

### Failures repaired here (harness only, product unchanged)

All four were already failing at `HEAD` (the harness pinned code the simplification moved or removed); none was
caused by a review fix.

| File | Cause | Change | Re-run |
| --- | --- | --- | --- |
| `test/quint-back-dispatch.test.mjs` | sliced `agent-adapter.ts` up to `const notesLeave`, which went with the legacy Notes store | slice ends at `const originalMount`, the next declaration; the sliced function text is the same | 2 pass, 0 fail |
| `test/quint-browser-hosted-result-notice.test.mjs` | `revision.ts` and `hosted-results.ts` now import `randomHex`, `sha256Hex`, `canonicalJson`, `agentOwnerKey` from `lib/`; the vm context did not load them, and the local `canonical` is now `canonicalJson` | added `lib/hash.ts`, `lib/json.ts`, `lib/session-key.ts` to the evaluated sources; reads `canonicalJson` | 1 pass, 0 fail |
| `test/quint-saved-service-read.test.mjs` | `new AgentCalendar(port, preservation, client, …)`; the preservation parameter was deleted with the legacy Calendar authority | dropped the argument and the unused `preservation` stub (same fix `MERGE-gate.md` made in `calendar-approval-ui`) | 1 pass, 0 fail |
| `test/quint-inbox-list-paging.test.mjs` | the cleanup removed `typeof binding.client.gmailRead!=='function'` from `prepareBodies` (the real client always has it); the paging fixture's client had no `gmailRead` | `specs/quint/refinement/services/inbox-list-paging-ports.mjs` gives the fixture a `gmailRead` that stays unanswered, so the paging projection observes what it did before | 1 pass, 0 fail |

Not done: `specs/quint/application/manifest.json` still lists the old source set for `BrowserHostedResultNotice`
(without the three `lib/` files). The harness captures them itself; the manifest row is for the formal stage.

After these: 84 of 88 files pass.

### Still failing (4 files, 4 cases)

1. `test/ui-self-contained.test.mjs`, "no source, script, spec, test or document refers to upstream UI": 9 pass,
   1 fail. All 30 offenders are under `docs/simplification-audit/`; none is product, script, spec or test. Same
   finding as `MERGE-gate.md`. The guard was not edited. It passes when the audit directory is not merged, or needs an
   owner-approved exemption.
2. `test/quint-application-refinement.test.mjs`, `durableStore`: 18 pass, 1 fail.
   `specs/quint/refinement/application/storage.mjs:44` expects `Older browser data changed` from
   `BrowserDomainDocument.readRaw()`. That is the legacy-envelope race, deleted on purpose with the legacy browser
   envelopes. Needs the DurableStore model's `legacyWrite` half and the harness's `legacy` race removed.
3. `test/quint-browser-reminder-orphan-refinement.test.mjs`: 0 pass, 1 fail, `data.reminders` of null at line 58 in
   the first scenario, `legacy-import-has-a-visible-row-but-no-deletion-authority`. It seeds `localStorage` and
   expects the reminder document to import it; the legacy reader is deleted. Needs the model's legacy-import state
   and the three `legacy` scenarios removed.
4. `test/quint-canonical-calendar-draft-handoff.test.mjs`: 0 pass, 1 fail. Not load: it failed the same way alone
   with `ALPHA_TIMEOUT_SCALE=6` (390 s). The failing schedule is the last one, "unapproved preservation never admits a
   canonical Note event" (`initWith(false)`, `legacyTitle` fixture): it waits for a refusal that only the deleted
   legacy Calendar authority raised. The four schedules before it complete. Needs the `initWith(false)` half of the
   model and that schedule removed.

Items 2 to 4 are the same kind: a model that still describes a legacy path this change deletes by decision. They
were failing at `HEAD`, not because of a review fix. Each needs a model edit plus a Quint run, which is the formal
stage (`STAGE-E.md` §4, E-formal), so they are left for it.

## 3. Not run

- The full host suite (`bun run test:only`, 500+ files) was not run again; `MERGE-gate.md` has the one full run.
- `test/quint-*` outside the 41 selected, `quint:check`, `quint:tests`, `lemma:check`.
- Browser tests, Android Gradle build, emulator, image boot, device. `AlphaDeletionsPlugin.java` (now calling
  `PluginWorkers.submit`, same signature as the removed `AlphaUtil.submit`) is read-checked only, not compiled.
- `bun install --frozen-lockfile`: `licenses`, `sbom`, `font-license` and `voice-host-record` were not in the
  selection and their stale-`node_modules` failures from `MERGE-gate.md` were not re-checked.

## 4. First-pass results, every file

Exit 1 rows marked "fixed" pass on the re-run in §2.

| File (`test/<name>.test.mjs`) | pass | fail | exit | time |
| --- | --- | --- | --- | --- |
| `action-completion-one-sentence` | 6 | 0 | 0 | 0s |
| `adapter-contracts` | 9 | 0 | 0 | 6s |
| `agent-copy-mappings` | 13 | 0 | 0 | 0s |
| `android-build-path` | 6 | 0 | 0 | 1s |
| `android-instrumentation-runner` | 23 | 0 | 0 | 2s |
| `calendar-approval-ui` | 39 | 0 | 0 | 5s |
| `calendar-sync-mutation` | 1 | 0 | 0 | 7s |
| `camera-view-first` | 3 | 0 | 0 | 1s |
| `ci-emulator-evidence` | 4 | 0 | 0 | 0s |
| `ci-required-checks` | 7 | 0 | 0 | 1s |
| `clock-handoff-current-envelope` | 2 | 0 | 0 | 2s |
| `comms-alpha` | 12 | 0 | 0 | 1s |
| `comms-messages-bar` | 4 | 0 | 0 | 0s |
| `device-capability-selection` | 5 | 0 | 0 | 0s |
| `diagnostics-export` | 15 | 0 | 0 | 1s |
| `embedding-abi-package` | 5 | 0 | 0 | 1s |
| `google-accounts` | 13 | 0 | 0 | 0s |
| `google-calendar-connect` | 36 | 0 | 0 | 10s |
| `google-calendar-link-status` | 4 | 0 | 0 | 0s |
| `google-workspace-return-flow` | 2 | 0 | 0 | 7s |
| `google-workspace-return` | 17 | 0 | 0 | 1s |
| `home-cards` | 15 | 0 | 0 | 0s |
| `home-overview-cards` | 7 | 0 | 0 | 0s |
| `home-shell` | 12 | 0 | 0 | 0s |
| `image-sms` | 12 | 0 | 0 | 1s |
| `inbox-retention-cases` | 3 | 0 | 0 | 5s |
| `keyboard-dictation` | 4 | 0 | 0 | 20s |
| `mail-attachment-refusals` | 6 | 0 | 0 | 0s |
| `native-build-inputs` | 10 | 0 | 0 | 5s |
| `native-copy-mappings` | 16 | 0 | 0 | 0s |
| `notes-organize` | 7 | 0 | 0 | 0s |
| `notes-recorder` | 28 | 0 | 0 | 4s |
| `notes-view` | 5 | 0 | 0 | 0s |
| `owner-copy-mappings` | 8 | 0 | 0 | 0s |
| `owner-route-parity` | 4 | 0 | 0 | 18s |
| `plugin-worker-guard` | 1 | 0 | 0 | 2s |
| `quint-account-sheet-refinement` | 1 | 0 | 0 | 38s |
| `quint-android-build-input-readiness` | 1 | 0 | 0 | 12s |
| `quint-app-update-candidate` | 1 | 0 | 0 | 15s |
| `quint-application-refinement` | 18 | 1 | 1 | 140s |
| `quint-back-dispatch` (fixed) | 0 | 1 | 1 | 1s |
| `quint-batch-capture-completion` | 1 | 0 | 0 | 12s |
| `quint-browser-alarm-ringing` | 2 | 0 | 0 | 14s |
| `quint-browser-deletion-poll` | 1 | 0 | 0 | 6s |
| `quint-browser-hosted-result-notice` (fixed) | 0 | 1 | 1 | 1s |
| `quint-browser-reminder-orphan-refinement` | 0 | 1 | 1 | 2s |
| `quint-calendar-editor-draft` | 4 | 0 | 0 | 133s |
| `quint-camera-agent-capture` | 2 | 0 | 0 | 62s |
| `quint-camera-preview-retirement` | 1 | 0 | 0 | 20s |
| `quint-canonical-calendar-draft-handoff` | 0 | 1 | 1 | 284s |
| `quint-canonical-calendar-editor-close` | 1 | 0 | 0 | 75s |
| `quint-cloud-connection-notices` | 1 | 0 | 0 | 32s |
| `quint-composition-refinement` | 1 | 0 | 0 | 75s |
| `quint-dock-clearance-ownership` | 1 | 0 | 0 | 13s |
| `quint-files-recent-index` | 3 | 0 | 0 | 31s |
| `quint-google-access-publication` | 1 | 0 | 0 | 13s |
| `quint-google-calendar-disconnect` | 1 | 0 | 0 | 57s |
| `quint-google-calendar-link-flow` | 1 | 0 | 0 | 59s |
| `quint-google-calendar-link-publication` | 1 | 0 | 0 | 56s |
| `quint-historical-calendar-navigation` | 1 | 0 | 0 | 26s |
| `quint-historical-camera-session` | 1 | 0 | 0 | 35s |
| `quint-inbox-list-paging` (fixed) | 0 | 1 | 1 | 0s |
| `quint-keyboard-dictation-cloud` | 1 | 0 | 0 | 15s |
| `quint-modal-toast-forwarding` | 1 | 0 | 0 | 12s |
| `quint-native-clock-review` | 1 | 0 | 0 | 45s |
| `quint-native-refinement` | 17 | 0 | 0 | 626s |
| `quint-notes-document-transfer` | 3 | 0 | 0 | 14s |
| `quint-permission-choices` | 1 | 0 | 0 | 334s |
| `quint-permission-coordinator-refinement` | 1 | 0 | 0 | 69s |
| `quint-photos-owned-album` | 4 | 0 | 0 | 15s |
| `quint-saved-service-read` (fixed) | 0 | 1 | 1 | 1s |
| `quint-services-refinement` | 13 | 0 | 0 | 122s |
| `quint-shell-screen` | 3 | 0 | 0 | 8s |
| `quint-voice-turn-review` | 1 | 0 | 0 | 29s |
| `quint-workflow-clock-admission` | 1 | 0 | 0 | 14s |
| `quint-workflow-engine-refinement` | 2 | 0 | 0 | 179s |
| `quint-workflow-request-recovery-admission` | 1 | 0 | 0 | 14s |
| `screen-copy-mappings` | 11 | 0 | 0 | 0s |
| `sms-incomplete-rows` | 6 | 0 | 0 | 1s |
| `staged-copy-mappings` | 11 | 0 | 0 | 0s |
| `strict-build-inputs` | 3 | 0 | 0 | 1s |
| `system-notice-collapse` | 7 | 0 | 0 | 0s |
| `ui-self-contained` | 9 | 1 | 1 | 26s |
| `upstream-pin-guard` | 7 | 0 | 0 | 10s |
| `view-profile-capability-header` | 1 | 0 | 0 | 1s |
| `workflow-definition-bounds` | 7 | 0 | 0 | 0s |
| `workflow-worker-assets` | 2 | 0 | 0 | 5s |
| `workspace-return-fallback` | 1 | 0 | 0 | 5s |
