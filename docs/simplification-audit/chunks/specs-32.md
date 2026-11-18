# Chunk specs-32 summary

Application-family Quint refinement harnesses (`specs/quint/refinement/application/s*–w*`). Every product file
they read still exists; every text anchor checked still matches once. Two harnesses are already out of sync
with this branch's legacy deletions (storage, startup-permissions).

| File | Kind | Verdict |
|---|---|---|
| `screen-focus-ownership.mjs` | upstream + `view-focus.ts` transplant, marker-inserted inspector | PORT (bundle `view-focus.ts`; drop digest re-checks) |
| `selected-document-viewer.mjs` | model-trace replay on bundled real module | KEEP (use merged trace runner) |
| `settings-page-focus.mjs` | `model.js` slice (`var stPageFocus =` … `/* the prototype page`) | PORT (export `stPageAccess` at `model.js` split); needs per-model test |
| `shade-notice-question-admission.md` | prose | KEEP (trim history) |
| `shade-notice-question-admission.mjs` | harness over text-slicing fixture | KEEP; fixture PORT; dedupe `test/shade-notice-question.test.mjs` |
| `shade-row-custody.mjs` | harness over text-slicing fixture | KEEP; fixture PORT; delete `test/shade-row-custody.test.mjs` |
| `share-panel-admission.mjs` | `sourceContext` transplant | PORT (`loadBundled`, trivial: no imports) |
| `shell-coordinator.mjs` | mounted app in Chromium, 2 Vite-transform anchors | KEEP (simplify); needs per-model test |
| `shell-core-fixture.mjs` | `model.js` 4-range slice support | KEEP until `model.js` split, then PORT |
| `shell-model-traces.mjs` | ITF trace runner | MERGE into `specs/quint/refinement/model-traces.mjs` with `assistant-model-traces.mjs`, `browser-model-traces.mjs` |
| `source-renewal-question.mjs` | mounted digest panel in Chromium | KEEP; delete `test/source-renewal-question.test.mjs` |
| `startup-permissions-coordinator.mjs` | real React component bundled, JSDOM | KEEP (trim legacy-version scenarios, drop hook-index pins) |
| `startup-update-admission.mjs` | upstream transplant, marker-inserted inspector | PORT; drop `checkClientFeatures`/digest/tombstone asserts |
| `storage.mjs` | real bundled `BrowserDomainDocument` | KEEP (delete `legacy` race; broken now); needs per-model test |
| `support.mjs` | shared support | KEEP (shrink): delete `sourceContext`/`read`; move `tick`/`deferred` etc. to family-neutral `refinement/support.mjs` |
| `surfaces.mjs` | 4 adapters | SPLIT: `shellNavigation` DELETE, `developmentSurfaces` PORT (`bundledSource` + `define`), `developmentDevice` PORT or DELETE with dev phone simulator, `filesTree` KEEP in own file |
| `vault-coordinator-notes.md` | prose | MERGE into `vault-coordinator.mjs` header |
| `vault-coordinator.mjs` | `sourceContext` transplant reading private vars | PORT (bundle with stubs; observe rows + port calls) |
| `voice-owned-navigation.mjs` | `voice-adapter.ts` closure slice | PORT (extract navigation-claim module) |
| `voice-transcript-follow.mjs` | `model.js` slice + injected observer | PORT (at `model.js` split) |
| `workflow-clock-admission.mjs` | harness over text-slicing fixture | KEEP; fixture PORT |
| `workflow-request-recovery-admission.mjs` | `sourceContext` transplant | PORT (`sourceModule`, trivial) |

## Behaviours that would lose coverage
- No file here is a plain DELETE except `surfaces.mjs#shellNavigation`, whose `ShellNavigation` model stays refined by
  `shell-coordinator.mjs` (mounted app, stronger).
- **Aggregate-only harnesses**: `shell-coordinator`, `settings-page-focus`, `storage` (`DurableStore`), all four
  `surfaces` adapters (`DevelopmentSurfaces`, `DevelopmentDevice`, `FilesTree`) run only via
  `test/quint-application-refinement.test.mjs`. Deleting the aggregate (planned, T4) without adding per-model entries
  drops their refinement coverage entirely. Add per-model wrappers (or a generic per-model runner) first.
- `DurableStore` legacy-race and `PermissionWalkthrough` historical-version scenarios are intentionally lost (D1);
  model and harness must be trimmed together.
- If D3 removes the domain-recovery "Download backup", the `capture` step of `WorkflowRequestRecoveryAdmission` goes.

## Shared helpers worth keeping
- `support.mjs`: `bundledSource`/`sourceModule`, `memoryStore`, `trace`/`checkpoint`/`call`, `tick`, `deferred`.
- `browser-model-traces.mjs` `loadBundled`/`installDocument`/`countListeners` — the right pattern for ports
  (share-panel, workflow-request-recovery, vault).
- One merged ITF trace runner (from `shell-model-traces.mjs` + two twins).
- `test/browser/flag-off-android.ts` (`fenceNetwork`), `test/browser/resident-stub.ts` (shell-coordinator).

## Cross-file actions
- Trim together: `storage.mjs` legacy race + `specs/quint/application/DurableStore.qnt` legacy state/actions.
- Trim together: `startup-permissions-coordinator.mjs` `auth-ready-preserves-completed-{4,5,6}` + `s.legacyCompleted`
  and `PermissionWalkthrough.qnt` `legacyCompleted`/`historicalInstall`/`legacyCompletionTest`.
- `model.js` split (stage F) must ship ports for `shell-core-fixture.mjs`, `settings-page-focus.mjs`,
  `voice-transcript-follow.mjs`, `surfaces.mjs#developmentDevice`, and fixture `test/fixtures/workflow-clock-admission.mjs`;
  `voice-adapter.ts` split must ship the `voice-owned-navigation.mjs` port. All before Prettier.
- One notifications fixture (bundled `installNotificationsAdapter`) for both shade harnesses.
- Drop provenance writers with no reader: `test-results/quint-refinement/shell-coordinator-source.json`,
  `vault-coordinator-source.json`; remove aggregate paths pre-captured in `support.mjs:16-22`.
- Remove `createTransferClient` stub from `vault-coordinator.mjs` when password transfer (D3) is deleted.
- Delete `dev-profile.ts`'s duplicated `devSurfacesEnabled` once `developmentSurfaces` uses `bundledSource` with `define`.
- Upstream follow-ups (D14): exported inspectors for `screen-focus.ts` and `app-update-gate.ts` scheduling state, or
  accept DOM/port-only projections.

## Owner questions
- Does the development phone simulator (`PN` in `model.js`, `DevelopmentDevice` model) survive D19? If no retained
  e2e drives it, delete simulator, model and adapter together.
- Is the domain-recovery "Download … backup" (damaged document bytes) inside D3's backup deletion?
- Keep provenance hashing (`captureSources`/`boundInputs`/`driverHashes`) at all (ci-and-formal §2.8)?
