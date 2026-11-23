# Chunk scripts-15: `scripts/test-*` suites (device actions, Gmail/Google, Inbox, upgrade, local agent)

21 files, 2,946 lines, all present. Every file is a test suite living in `scripts/` (T9); 17 are reached only through
spawn shims in `test/` or `test/browser/adapters.spec.ts`. Per-file reports: `files/scripts/test-*.ts.md`.

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| test-device-actions.ts | 162 | integration (real `DeviceActions`, loopback HTTP) | MOVE | `test/integration/device-actions.test.ts` |
| test-device-timing-source.ts | 14 | tooling (upstream vitest in prepared source; CI resident-android) | MERGE | `scripts/run-upstream-source-tests.ts` (suite `device-actions`) |
| test-digest-cancellation.ts | 47 | unit, risky concurrency (T3 exception) | MERGE | `test/integration/digests.test.ts` (with `test-local-digest-storage.ts`) |
| test-gmail-mailbox.ts | 133 | unit + transport-boundary integration | MERGE (protocol half) | `test/integration/cloud-protocol.test.ts` |
| test-gmail-read-ahead.ts | 26 | unit | MERGE (2 cases) | `test/integration/inbox-provider.test.ts` |
| test-google-accounts.ts | 93 | unit (bundled real module) | DELETE (1 case to Quint lifecycle harness) | — |
| test-google-calendar-protocol.ts | 71 | transport-boundary integration | MERGE live half; DELETE calendar half (C3) | `test/integration/cloud-protocol.test.ts` |
| test-google-calendar-selection.ts | 41 | unit of a D4-deleted module | DELETE | — |
| test-hosted-live-source-picker.ts | 30 | Playwright library on a fixture page + own Vite build | REWRITE | `test/browser/journeys/digests.spec.ts` |
| test-inbox-attention-flow.ts | 338 | source transplant (vm) | REWRITE | `test/browser/journeys/inbox.spec.ts` (+2 pure cases to inbox integration) |
| test-inbox-cloud-flow.ts | 449 | source transplant (vm) | REWRITE | `test/browser/journeys/inbox.spec.ts` |
| test-inbox-drafts-browser.ts | 80 | Playwright library, in-page backdoors (T6) | REWRITE | `test/browser/journeys/inbox.spec.ts` |
| test-inbox-grant-withdrawal.ts | 182 | source transplant (vm) | PORT to real import | `test/integration/inbox-provider.test.ts` |
| test-inbox-multiple-drafts.ts | 73 | unit with string module mocks | MERGE | `test/integration/inbox-provider.test.ts` |
| test-inbox-retention-cases.ts | 120 | source transplant (vm) | REWRITE | `test/browser/journeys/inbox.spec.ts` |
| test-inbox-saved-drafts.ts | 32 | unit with module mocks | DELETE (1 case to inbox integration) | — |
| test-inbox-sent-cleanup.ts | 629 | source transplant (vm) | PORT to real import | `test/integration/inbox-provider.test.ts` |
| test-installed-upgrade.ts | 141 | emulator device runner (manual campaign) | SIMPLIFY (drop calendar, bridge, legacy-digest) | reminder-only, or fold into `scripts/pilot-update.ts` |
| test-local-agent-source.ts | 15 | tooling (upstream bun tests; never run by CI) | MERGE | `scripts/run-upstream-source-tests.ts` (suite `workspace`) |
| test-local-agent-stream.ts | 271 | integration (real bundled modules, dev proxy, SSE) | MERGE (drop `RemoteProtocol` cases, C4) | `test/integration/local-agent.test.ts` |
| test-local-agent.ts | 182 | integration (dev proxy, protocol, dev storage gating) | MERGE | `test/integration/local-agent.test.ts` |

Tally: keep/move 2 (device-actions, installed-upgrade simplified), delete 3, merge/rewrite/port 16.

## Coverage that would be lost if the DELETEs (and drops) happen without the named replacements

- **P-37 change-grant withdrawal** discarding an undispatched Gmail review (preparing or review phase, same-turn
  unbind): only `test-inbox-grant-withdrawal.ts`. Must be ported before the transplant harness is deleted.
- **Sent-cleanup identity rules** (identical content in another draft/account never cleared; receipt disagreement on
  resume; From-account move; source draft id never sent): only `test-inbox-sent-cleanup.ts`; journey-f specs cover
  the basic paths only.
- **Revoked Home warmup with a failed cache purge** must not restore subjects; **late disk restore vs live page**;
  **expired key during read-state change**: only `test-inbox-cloud-flow.ts`.
- **Hidden page cancels prepared Gmail body reads**: only `test-inbox-attention-flow.ts` (no Playwright hit).
- **Archive waits for the re-read revision** after a read-state change: only `test-inbox-retention-cases.ts` case 9.
- **Stale Google-accounts helper refuses connect/list** after a session/credential change: only
  `test-google-accounts.ts:55-61`; the Quint lifecycle harness covers the return watcher, not the helper.
- **Draft slot refusal of `cloud:production`**: only `test-inbox-saved-drafts.ts:24-25`.
- **Android native routing of Inbox drafts** to `secureConnectionStore`: only a mocked check here; dropping it
  leaves no host coverage (needs instrumentation if wanted).
- **Calendar installed upgrade**: deliberately removed (A23); reminder upgrade remains.

## Shared helpers worth keeping (move to `test/fixtures/`)

- `scripts/fixtures/loopback.ts` (device actions, local agent, live-source picker).
- `scripts/fixtures/device-action-journal.ts`, `hosted-digest-protocol.ts`, `inbox-memory.ts`.
- `test/fixtures/browser-source.mjs` `loadBrowserModule`: the real-import loader every PORT here should use.
- One digest storage fake (twinned in `test-digest-cancellation.ts` and `test-local-digest-storage.ts`).

To delete once their importers are gone: `scripts/fixtures/prototype-script.ts` (transplant loader),
`scripts/inbox-adapter-fixture.ts` (307-line vm harness; importers attention-flow, cloud-flow, retention-cases),
`scripts/fixtures/bundled-module.ts` (string-mock bundler; also used by `test-mail-html.ts`, another chunk),
`scripts/fixtures/playwright.ts` + `ALPHA_BROWSER_MODULES` (only for script-hosted browser tests),
`scripts/fixtures/hosted-live-source/`.

## Cross-file actions

1. Create `test/integration/inbox-provider.test.ts`: bundles real `prototype/inbox-provider-controls.ts`,
   `inbox-drafts.ts` and the adapter wiring (export it from `inbox-cloud-adapter.ts` instead of copying it), real
   `inbox-unsaved.ts` over a memory store. Receives grant-withdrawal (8), sent-cleanup (~12), multiple-drafts (4),
   read-ahead (2), saved-drafts (1), attachment limits (from attention-flow).
2. Create `test/integration/cloud-protocol.test.ts` from `test-gmail-mailbox.ts` protocol half, the live half of
   `test-google-calendar-protocol.ts`, and the Gmail/Google parts of `test-cloud-protocol.ts` (other chunk).
3. Create `test/integration/local-agent.test.ts` from both local-agent files; delete `RemoteProtocol` cases with C4.
4. `journeys/inbox.spec.ts` and `journeys/digests.spec.ts` receive the REWRITE cases listed per report.
5. Delete shims: `test/adapter-contracts.test.mjs` rows (device-actions, gmail-mailbox, google-calendar-protocol,
   inbox-cloud-flow, inbox-grant-withdrawal, inbox-sent-cleanup), `test/local-agent-contracts.test.mjs` rows
   (local-agent, local-agent-stream, digest-cancellation), `test/inbox.test.mjs` rows (attention-flow,
   multiple-drafts, saved-drafts), `test/gmail-read-ahead.test.mjs`, `test/google-accounts.test.mjs`,
   `test/google-calendar-selection.test.mjs`, `test/inbox-retention-cases.test.mjs`, two rows in
   `test/browser/adapters.spec.ts`.
6. Delete with C3: `CloudProtocol.googleCalendars`, `googleCalendarFeed` (no product caller), `initiateGmail`
   (no product caller), `runtime/google-calendar-selection.ts`.
7. C7: remove calendar branch/`--bridge`/`legacy-digest` from `test-installed-upgrade.ts`, the
   `WorkflowLegacyReminderUpgrade` registry row (`android-instrumentation.ts:297`) and its assertions in
   `test/android-instrumentation-runner.test.mjs:558-559` and `test/installed-upgrade-runner.test.mjs`.
8. Merge `test-device-timing-source.ts` + `test-local-agent-source.ts` into one upstream-source runner; drop the
   duplicate `prepare-local-agent --source-only` in the resident CI step.
9. Remove the self-respawn-under-tsx blocks (`test-device-actions.ts:10-12`, `test-google-calendar-protocol.ts:5-7`).

## Owner questions

1. Keep the reminder installed-upgrade campaign, or make `scripts/pilot-update.ts` the single "update keeps data"
   check (C7 asks for one)?
2. Run `test-local-agent-source.ts` (upstream workspace tests + canonical identity) in the resident CI lane, or
   delete it? Today `npm run agent:test` gates nothing.
3. Managed-service admissions for `/google/calendar/feed` and `/calendars` (C3 "open"): delete with the client
   sync stack?
4. Re-running upstream suites (`device-actions` vitest, workspace bun tests) from Alpha CI: keep until upstream CI
   covers them (D14 follow-up)?
