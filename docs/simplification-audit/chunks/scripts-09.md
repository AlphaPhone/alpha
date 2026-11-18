# Chunk scripts-09: `scripts/fixtures/*` and `scripts/f*`–`scripts/l*`

31 files reviewed; 31 reports under `files/scripts/`. All files still exist in the worktree.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `scripts/fixtures/bundled-module.ts` | test support (esbuild real-module loader) | MOVE + MERGE | `test/support/bundle-module.ts` (absorbs `local-agent-stream.ts`) |
| `scripts/fixtures/calendar-adapter.ts` | source transplant (T2) | DELETE | cases to `journeys/calendar.spec.ts` |
| `scripts/fixtures/cloud-delegation/capacitor.ts` | component-page fixture | MOVE | `test/fixtures/component-pages/cloud-delegation/` |
| `scripts/fixtures/cloud-delegation/controls.ts` | component-page fixture | MOVE | same |
| `scripts/fixtures/cloud-delegation/entry.tsx` | component-page fixture (real panel + protocol) | MOVE | same; share transport with hosted-live-source |
| `scripts/fixtures/cloud-delegation/index.html` | component-page shell | MOVE | same |
| `scripts/fixtures/cloud-delegation/native.ts` | component-page fixture (secure store fake) | MOVE | same; take `cloudDelegationSlot` from product (test-only export) |
| `scripts/fixtures/device-action-journal.ts` | test support (memory journal) | MERGE | inline into device-actions integration test |
| `scripts/fixtures/hosted-digest-protocol.ts` | test support (stubbed protocol) | MERGE | inline into digest test (or delete with T3 importers) |
| `scripts/fixtures/hosted-live-source/entry.tsx` | component-page fixture | MOVE + reformat | `test/fixtures/component-pages/hosted-live-source/` |
| `scripts/fixtures/hosted-live-source/index.html` | component-page shell | MOVE | same |
| `scripts/fixtures/inbox-memory.ts` | test support (memory CAS store) | MERGE | `test/support/memory-slot-store.ts` |
| `scripts/fixtures/local-agent-stream.ts` | test support (esbuild loader) | MERGE | `test/support/bundle-module.ts` |
| `scripts/fixtures/loopback.ts` | test support | KEEP, MOVE | `test/support/loopback.ts`; replace ~14 hand-rolled copies |
| `scripts/fixtures/playwright.ts` | test support (resolve Playwright for script-launched browsers) | DELETE (after specs replace the scripts) | — |
| `scripts/fixtures/prototype-script.ts` | source transplant machinery (T2) | DELETE | — |
| `scripts/fixtures/speech-bridge.ts` | integration support (real dev bridge + fake agent) | MOVE | `test/support/speech-bridge.ts` |
| `scripts/fixtures/workflow-host.ts` | manual probe support | DELETE | with the six unwired `test-workflow-*-host.ts` probes |
| `scripts/font-license-blockers.ts` | release tooling | KEEP, SIMPLIFY | — |
| `scripts/generate-alpha-os-branding.ts` | manual AOSP branding tool | KEEP, SIMPLIFY | owner confirms still used |
| `scripts/generate-licenses.ts` | release tooling (1,038 lines) | KEEP, SPLIT | `scripts/licences/` (collectors shared with SBOM) |
| `scripts/generate-sbom.ts` | release tooling | KEEP, SIMPLIFY | consume shared licence inventory |
| `scripts/gmail-agent-dev-broker.ts` | dev-server middleware | MERGE | `scripts/dev-server/gmail-agent.ts` |
| `scripts/gmail-agent-read-host.ts` | dev-server composition | MERGE | `scripts/dev-server/gmail-agent.ts` |
| `scripts/gradle-verification.ts` | release tooling | KEEP, SIMPLIFY | — |
| `scripts/host-speech-admission.ts` | host runtime admission | KEEP, SIMPLIFY | — |
| `scripts/host-speech-assets.json` | data (pins) | KEEP | — |
| `scripts/inbox-adapter-fixture.ts` | source transplant (T2) + stub provider (T3) | DELETE / REWRITE | `journeys/inbox.spec.ts` |
| `scripts/inject-emulator-audio.py` | emulator test tool | KEEP | — |
| `scripts/instrumentation-result.ts` | release/test tooling | KEEP, SIMPLIFY | — |
| `scripts/launcher-child.ts` | launcher helper | MERGE | `scripts/private-runtime-launch.ts` |

Counts: KEEP (incl. KEEP+SIMPLIFY/SPLIT and KEEP+MOVE) 10, MOVE-only 8, MERGE 8, DELETE 5 (`calendar-adapter.ts`, `prototype-script.ts`,
`workflow-host.ts`, `inbox-adapter-fixture.ts`, and `playwright.ts` once the browser scripts become specs).

## Behaviours that lose coverage if the DELETEs happen

These need a replacement before or with the deletion:

1. **Calendar adapter native states** (from `fixtures/calendar-adapter.ts` importers): busy edit/delete, "write may not have saved" with
   re-check, stale query result not replacing a newer one. Target `journeys/calendar.spec.ts`; check the 45 Calendar specs first, the race
   may already be covered.
2. **Inbox adapter behaviour** (from `inbox-adapter-fixture.ts` and `prototype-script.ts` importers): attention badge, link mismatch warning,
   attachment review, drafts, review-before-send never dispatching, grant withdrawal clearing notices and cache, account-switch staleness,
   retention cases. Target `journeys/inbox.spec.ts` with a test-mocks Gmail provider (the `scenario()` fake client is the starting point).
3. **Clock hand-off and Maps reroute freshness** (`test-clock-handoff-flow.ts`, `test-maps-reroute-freshness.ts` use `prototype-script.ts`):
   need `journeys/workflows.spec.ts` / `journeys/maps.spec.ts` cases or a real-import integration test.
4. **Unwired workflow host probes** (`workflow-host.ts`): nothing runs them today, so deleting loses no executed coverage.

## Shared helpers worth keeping

- `loopback.ts` (adopt in ~14 test files that hand-roll it).
- One `bundle-module.ts` loader (merge of `bundled-module.ts` + `local-agent-stream.ts`).
- One `memory-slot-store.ts` (merge of `inbox-memory.ts` and the CAS in `cloud-delegation/native.ts`).
- One fake local agent with the auth handshake (from `speech-bridge.ts`; twins in `browser-cloud-dev-bridge.test.mjs`,
  `local-agent-voice-bridge.test.mjs`).
- The two component pages (cloud delegation, hosted live source): real product UI and protocol with only the native boundary faked,
  driven from Playwright specs instead of standalone scripts.
- `scripts/lib/`: sha256, readJson/exists, directory walker, argument parser (generate-licenses, generate-sbom, font-license-blockers,
  gradle-verification, generate-alpha-os-branding all carry local copies).

## Cross-file actions

- `generate-licenses.ts` + `generate-sbom.ts`: one collector pass, two renderers; outputs byte-identical (`--check` in `npm test`,
  `test/sbom.test.mjs`).
- Remove re-exports from `generate-licenses.ts` (licence-policy constants, `VOICE_HOST`, `voiceHostProblems`); importers use the owners.
- `ApkManifest` type: one export (`generate-sbom.ts`, `qualify-head.ts`, `provision-unit.ts`).
- `removed-profile-flags.ts` (used by `gradle-verification.ts`) and `speech-env.ts` `RENAMED`/`RETIRED` (used by
  `host-speech-admission.ts`): delete the refusals (A8).
- `gradle-verification.ts`: one aapt2 origin constant (the committed metadata only contains the "legacy" `.mjs` string).
- `cloud-delegation-ui.tsx:34` `cloudDelegationSlot`: test-only export; move into the fixture.
- `launcher-child.ts` merge: update `specs/quint/services/manifest.json` and the four launcher harness `support` lists in the same change.
- Gmail dev modules merge: give the broker its read host as a parameter so `test/calendar-managed-rejection.test.mjs` stops rewriting
  an import specifier.
- `scripts/maps/test-renderer.ts`, `scripts/maps/test-recovery-renderer.ts`, `scripts/test-photo-filter-png-reference.ts` (importers of
  `fixtures/playwright.ts`) have no runner; flag to the chunks that own them.
- The six `scripts/test-workflow-*-host.ts` / `test-reviewed-workflow-host.ts` probes and the comment at
  `start-reviewed-workflow-agent.ts:4-8` go with `workflow-host.ts`.

## Owner questions

1. Is the ARM64 embedding host still shipped? `generate-sbom.ts` labels its libraries "legacy qualification record" whenever the vendor
   `consumer.gradle` exists, which it does at the current pin, yet `android:build:local` still runs `agent:build-embedding-host`.
2. Is `generate-alpha-os-branding.ts` still run by hand to regenerate AOSP branding? If not, delete it with its role in the branding model.
3. Should the desktop host speech pins (`host-speech-assets.json`) derive from the Android voice-host record, which pins the same Paradee
   model bytes?
4. Keep the emulator voice-latency campaign (`inject-emulator-audio.py`, `native-voice-latency-emulator.ts`) as a documented manual tool,
   or retire it with the other manual Android campaign runners?
