# Chunk test-39: host tests locale-time … native-google-agent-host-access

38 assigned files (one already deleted). Per-file reports are in `files/test/<name>.md`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| locale-time-usage.test.mjs | source-text lint | DELETE | (optional ESLint rule) |
| locale-time.test.mjs | unit + source-text | REWRITE | `journeys/settings.spec.ts` (4 locale/hour-cycle cases) |
| login-surfaces.test.mjs | source-text inventory + upstream suite | DELETE | with `test/support/login-surfaces.mjs` |
| mail-html.test.mjs | wrapper (T9) | MERGE | `test/integration/inbox.test.mjs`; delete `scripts/test-mail-html.ts` |
| mail-preview.test.mjs | unit (dup of browser spec) | MERGE 1 case | `test/integration/inbox.test.mjs` |
| mail-sender-image.test.mjs | unit (security table) | MERGE | `test/integration/inbox.test.mjs` |
| managed-calendar-broker-read-header.test.mjs | unit of upstream broker | MERGE 3 cases | `test/integration/managed-google-broker.test.mjs` |
| managed-google-agent-broker.test.mjs | integration (real HTTP) | KEEP (base) | `test/integration/managed-google-broker.test.mjs` |
| managed-google-broker-diagnostic.test.mjs | integration-ish | MERGE | same |
| managed-google-stage-diagnostic.test.mjs | integration-ish | MERGE 2 cases | same |
| managed-google-transport-code.test.mjs | upstream classifier tables | MERGE 2 cases | same |
| managed-service-routes.test.mjs | unit (allowlist) + transplant | MERGE tables, DELETE transplant | `test/integration/connection-cloud.test.mjs` |
| map-theme-colors.test.mjs | transplant + source-text | DELETE | - |
| maps-chat-markup.test.mjs | wire-contract integration + transplant | MERGE 1-4, REWRITE 5-9 | `test/integration/maps.test.mjs`, `journeys/maps.spec.ts` |
| maps-dataset-manifest.test.mjs | Python wrapper | MERGE | one `scripts/maps` Python runner (path-scoped lane) |
| maps-navigation.test.mjs | mixed | MERGE agent-coverage case, DELETE rest | `test/integration/maps.test.mjs` |
| maps-notification-open.test.mjs | unit + host-javac + source-text | DELETE | (+ `test/fixtures/NavigationOpenRequestTest.java`) |
| maps-reroute-freshness.test.mjs | wrapper over transplant script | DELETE / REWRITE | `journeys/maps.spec.ts`; delete `scripts/test-maps-reroute-freshness.ts` |
| maps-route-distance.test.mjs | unit of upstream fn | DELETE | - |
| message-draft.test.mjs | unit (dup of Quint telephony refinement) | DELETE | - |
| mobile-uuid-build.test.mjs | tooling (dup of Quint mobile-bundle-admission) + source-text | DELETE | fixture kept |
| modal-scrim-ownership.test.mjs | Chromium integration (dup of Quint refinement) | DELETE | fixture kept |
| native-adapter-activity.test.mjs | esbuild stub-map unit | REWRITE | `journeys/settings.spec.ts` (Activity) |
| native-browser-view-binding.test.mjs | unit (dup of committed-view-observation refinement) | DELETE + 1 journey case | `journeys/browser.spec.ts` |
| native-calendar-sync-port.test.mjs | - | already deleted | - |
| native-campaign-evidence.test.mjs | tooling (manual campaign) | MERGE 4 cases (or DELETE with script) | `test/tooling/native-campaign.test.mjs` |
| native-cloud-control-jvm.test.mjs | Java transplant of upstream | DELETE | upstream follow-up |
| native-cloud-permission-handoff.test.mjs | Java transplant of upstream | DELETE | upstream follow-up |
| native-cloud-streaming.test.mjs | TS transplant of upstream | DELETE + REWRITE 2 cases | `journeys/voice.spec.ts` |
| native-connection-headers.test.mjs | transplant | REWRITE (real import) | `test/integration/connection-cloud.test.mjs` |
| native-credential-read.test.mjs | Java transplant | DELETE | - |
| native-deletion-admission.test.mjs | source-text (40 regexes, vendor) | DELETE | - |
| native-deletion-review-admission.test.mjs | host-JVM unit (dup of Quint replay) | DELETE | - |
| native-deletion-review-fence.test.mjs | host-JVM, real classes + stubs | MERGE | `specs/quint/refinement/native/deletion-coordinator.mjs` |
| native-digest-sources.test.mjs | host-JVM (dup of native-digest refinement) + source-text | DELETE | (+ `test/fixtures/NativeDigestSourcesTest.java`) |
| native-embedding-profile.test.mjs | source-text + upstream JVM | DELETE | - |
| native-enrollment-commit-order.test.mjs | transplant of connection-ui.tsx | DELETE | re-test after split |
| native-google-agent-host-access.test.mjs | cross-language integration | KEEP / MERGE | `test/integration/managed-google-broker.test.mjs` |

Totals: DELETE 19 (some with one or two journey carry-overs), KEEP 2, MERGE/REWRITE 16, already gone 1.

## Behaviours that lose all coverage if the DELETEs happen
- Credential read hook lock order (lifecycle then vault) and refusal during mutation (`native-credential-read`). Needs instrumentation or a native refinement.
- Enrollment slot commit before native notification wake (`native-enrollment-commit-order`). Re-test through a real import after the `connection-ui.tsx` split.
- Cloud speech bridge Java concurrency (permission/Stop handoff, PCM feeder zeroisation, relay renewal) and the TS streaming turn-drain/mute bound: upstream code, so upstream follow-up; Alpha keeps only voice journey cases.
- Vendor run window vs `NativeDigestSources.NATIVE_READ_PAST_MS` alignment (source-text cross-check). Needs a build-time constant if the owner wants it guarded.
- Map theme failure modes (unresolved tokens refuse construction). Not user-reachable; accepted loss.
- Maps share-choice send-once/staleness, Activity failure toast, browser review-gate refusal, reroute freshness: only covered by transplants today, so the journey cases above must land before the deletes.
- `askedDraftPlaced` in message-draft: confirm MessageThreads model covers it before deleting.

## Shared helpers worth keeping
- `test/support/managed-google-agent.mjs` (Alpha wiring of the shared Google host; 8 importers).
- `test/fixtures/modal-scrim-chromium.mjs`, `test/fixtures/mobile-uuid-build.mjs` (Quint refinement importers).
- `test/fixtures/GoogleAgentAccessFileTest.java` (kept integration test).
- `test/fixtures/isolated-native-campaign.mjs` only while the runner scripts stay.
- Delete with their only importers: `test/support/login-surfaces.mjs`, `test/fixtures/NavigationOpenRequestTest.java`, `test/fixtures/NativeDigestSourcesTest.java`, `scripts/test-mail-html.ts`, `scripts/test-maps-reroute-freshness.ts`.

## Cross-file actions
- Create `test/integration/managed-google-broker.test.mjs` from five `managed-*` files + `native-google-agent-host-access` (and delete `test/google-agent-access.test.mjs`, other chunk). One real-HTTP `call()` helper; no tsx self re-exec.
- Create `test/integration/inbox.test.mjs`, `test/integration/maps.test.mjs`, `test/integration/connection-cloud.test.mjs` receivers.
- One Python runner for `scripts/maps/*` tests, in a lane filtered on `scripts/maps/**`.
- Add reviewFence observations to the deletion-coordinator refinement.
- Upstream follow-ups: speech-bridge Java tests, `native-cloud-speech.ts` cases, managed-google transport classifier tables, `NativeRuntimeEmbeddings`.
- `deletions.ts` `reminderDeletionRefusal` wrapper exists for a regex in `native-deletion-admission` (D7); simplify once deleted.

## Owner questions
1. Does the broker `linked-sync` Calendar operation survive D4 (client linked-sync stack deletion)? It decides whether that case is carried.
2. Is `scripts/android-workflow-native.ts` (manual campaign, not in CI) kept? It decides whether native-campaign-evidence is merged or deleted.
3. Should the P-20 login-surface inventory survive as documentation in `docs/` once its source-text test is deleted?
4. Should the credential read-hook lock order get instrumentation coverage, or is the loss accepted?
5. Should the digest run-window alignment be enforced by a generated build constant?
