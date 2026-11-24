# Chunk scripts-10

| File | Kind | Verdict | Target |
|---|---|---|---|
| `scripts/licence-policy.ts` | shared release-tooling library | KEEP (simplify) | un-export internals; delete or wire `SOURCE_OFFER_MISSING` |
| `scripts/local-agent-dev-bridge.ts` | Vite dev-server proxy plugin | KEEP + MOVE + SIMPLIFY | `dev-server/local-agent-bridge.ts`; fold in `gmail-agent-dev-broker.ts` |
| `scripts/local-agent-dev-storage.ts` | dev-only host storage | KEEP + SIMPLIFY | moves with the bridge; Quint harness imports it (keep path in sync) |
| `scripts/local-agent-source.ts` | shared build library | KEEP + SIMPLIFY | helpers to `scripts/lib`; resolve its hash pins |
| `scripts/local-ocr-assets.ts` | Vite plugin | KEEP + MOVE | `vite-plugins/` with a shared local-asset plugin factory |
| `scripts/maps/dataset_manifest.py` | dev tooling lib + CLI | KEEP (simplify) | owner of region constants and file hash helper |
| `scripts/maps/dev.ts` | dev launcher (`dev:maps`) | KEEP (simplify) | shared launcher helper |
| `scripts/maps/graphhopper.yml` | config | KEEP | |
| `scripts/maps/index-region.py` | dev data prep | KEEP (simplify) | |
| `scripts/maps/prepare-region.py` | dev data prep | KEEP (simplify) | |
| `scripts/maps/serve-region.py` | dev regional Maps gateway | KEEP (simplify) | handler factory instead of verify-at-import |
| `scripts/maps/test-dataset-manifest.py` | integration (real gateway HTTP, synthetic data) | MOVE | `test/maps-regional-gateway.test.py` via `test/python-suites.test.mjs`; absorb gateway cases from `test/maps-navigation.test.mjs:101-116` and `test-region.py` |
| `scripts/maps/test-native-navigation.ts` | emulator campaign runner | MERGE | `test/android/maps-regional-campaign.ts` |
| `scripts/maps/test-native-recovery.ts` | emulator campaign runner | MERGE | `test/android/maps-regional-campaign.ts` |
| `scripts/maps/test-prepare-region.py` | unit (faked network/process) | DELETE | |
| `scripts/maps/test-recovery-renderer.ts` | orphan browser script | REWRITE then DELETE | `test/browser/journeys/maps.spec.ts` |
| `scripts/maps/test-region.py` | orphan live smoke | DELETE (carry 2 cases) | `test/maps-regional-gateway.test.py` |
| `scripts/maps/test-renderer.ts` | orphan browser journey script | REWRITE then DELETE | `test/browser/journeys/maps.spec.ts` |

## Behaviours that lose coverage if the DELETEs happen
- `test-prepare-region.py`: tamper/oversize refusal of pinned downloads and atomic Planetiler output for the
  developer-only regional dataset. No replacement proposed (manual tool, fails loudly when run); owner may keep it.
- `test-renderer.ts` / `test-recovery-renderer.ts` are never run today, so deleting them loses nothing that is
  currently checked, but the regional Maps journey (pins, place-detail wait, named origin, cancelled origin search,
  turn-by-turn/off-route/arrival, place detail tags, capabilities/route failure recovery) has no running coverage at all.
  The REWRITE into `journeys/maps.spec.ts` with a canned regional-provider fixture is needed to cover it.
- `test-region.py`: real-data GraphHopper routes for three modes are only checked by hand; the synthetic gateway test
  will cover tile y-flip and 422 refusals but not real routing.
- The two native runners are never run by CI; Maps emulator navigation/recovery is manual-only evidence either way.

## Shared helpers worth keeping / creating
- `scripts/maps/dataset_manifest.py` as the single owner of the Monaco provider id, bounds, default data path, and
  streaming sha256 (now duplicated across five Python/TS maps files).
- `scripts/lib`: `readPrivateToken(file)` (5 copies across `local-agent-dev-bridge.ts`, `gmail-agent-dev-broker.ts`),
  `sameOriginLoopback(req)` (3 here + `browser-cloud-dev-bridge.ts`), `sha256File`, `errorCode`/`isMissing`,
  upstream pin reader (`admittedCommit`).
- One local-asset Vite plugin factory shared by `local-ocr-assets.ts` and `browser-pdf-assets.ts`.

## Cross-file actions
1. Move `test-dataset-manifest.py` to `test/maps-regional-gateway.test.py`, add it to `test/python-suites.test.mjs`
   (needs `scripts/maps` on `sys.path`), delete `test/maps-dataset-manifest.test.mjs`; move the inline Python block of
   `test/maps-navigation.test.mjs:101-116` into it after `serve-region.py` gets a handler factory (no stub module).
2. Merge the two native Maps runners into `test/android/maps-regional-campaign.ts`; update
   `scripts/android-instrumentation.ts:313-314` `CAMPAIGN_RUNNERS` and the comment in
   `MapsBackgroundNavigationInstrumentedTest.java:16`.
3. `local-agent-source.ts` is hash-pinned by `scripts/verify-upstream.ts:60` and `scripts/ci/resident_native_source.py:12-13`,
   and listed as an input by `native-google-host-artifact.ts:66`; any edit (including the Prettier pass) must regenerate
   those or drop the pins. `android.yml:75` and `browser.yml:66` inline-import it; replace with one CLI entry.
4. Moving `local-agent-dev-bridge.ts`, `local-agent-dev-storage.ts`, `local-ocr-assets.ts` requires updating
   `vite.config.ts`, `scripts/quint-lib.ts:18`, `specs/quint/services/manifest.json:2609`,
   `specs/quint/refinement/services/development-digest-pending*.mjs`, two Quint harness path lists for OCR
   (`canonical-calendar-draft-handoff.mjs:14`, `legacy/camera-session.mjs:15`), and ~12 test import paths.
5. ~12 host tests drive `createLocalAgentDevHandler` (`local-agent-voice-bridge`, `cloud-prewarm`,
   `development-cloud-voice`, `development-conversation-stream`, `direct-transcription-proxy`,
   `enabled-view-transport`, `automations-transport`, `llama-cpp-only`, plus `scripts/test-local-agent*.ts`); they are
   integration tests of one dev surface and should be consolidated into one `test/dev-local-agent-bridge.test.mjs`
   (owned by the test chunks).
6. If stage A4 deletes the hosted digest store, delete the `digest*` branch of `local-agent-dev-storage.ts` and the
   `development-digest-pending` Quint model/harness together (D20).

## Owner questions
- `SOURCE_OFFER_MISSING` in `licence-policy.ts` is documented as reported by the licence review but nothing emits it.
  Delete it, or should the notice generation warn when `licenses/source-offer.json` is absent?
- Keep `test-prepare-region.py` (pinned-download integrity for the developer regional dataset) or accept deleting it?
- Should the Maps emulator campaigns (`test-native-navigation.ts`, `test-native-recovery.ts`) be wired into an emulator
  workflow, or stay documented manual campaigns?
- Does the pinned upstream voice-session route always send `stopIntentVersion`? If so the "legacy shape" acceptance in
  `local-agent-dev-bridge.ts:56-57` can be removed.
