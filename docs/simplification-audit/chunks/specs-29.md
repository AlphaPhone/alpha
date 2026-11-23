# Chunk specs-29: application refinement harnesses (google-consent … modal-toast)

29 files: 19 harness modules, the application aggregate `index.mjs`, and 9 harness `.md` notes. All 19 modelled
models are live in `specs/quint/application/manifest.json`; every product file they load exists in this worktree.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| google-consent-admission.mjs | source campaign (JSDOM+React, via text-transplant fixture) | PORT | bundle `google-connection-ui.tsx` with a port map; shared fixture with google-calendar-access-choice |
| home-failure-notice.md | harness doc | MERGE | header of home-failure-notice.mjs |
| home-failure-notice.mjs | source campaign (esbuild onLoad marker) | PORT | exported notice reducer in home-shell.ts |
| home-gesture.md | harness doc (stale Chromium claim) | MERGE | header of home-gesture.mjs |
| home-gesture.mjs | source campaign (two markers, one rewrites behaviour) | PORT | exported gesture controller + injected focus scheduler |
| hosted-background-admission.mjs | source campaign (`sourceContext` vm transplant) | PORT | `bundledSource` + stubs for platform-plugins/native |
| hosted-digest-mutation.mjs | source campaign (reuses mounted panel) | KEEP | drop `legacy` phase cases if Q-LEG-11 → delete |
| hosted-digest-refresh.mjs | source campaign (Chromium, tab-indented marker) + shared mount | PORT | split `withHostedDigestRefresh` into `hosted-digest-panel.mjs`; observe DOM/ports |
| hosted-notice-question.mjs | source campaign (real bundle + 2 port stubs) | KEEP | reference pattern |
| index.mjs | family aggregate + coverage check | REWRITE | one manifest-driven runner (`refinement` field per manifest entry) |
| keyboard-focus.mjs | transplant (two tab-anchored slices, cwd-relative read) | PORT | fold into KeyboardDetectors harness (model MERGE) |
| launcher-favorites.md | harness doc | MERGE | header |
| launcher-favorites.mjs | source campaign on generated upstream file | KEEP | owner Q: move upstream |
| launcher-observer.md | harness doc | MERGE | header |
| launcher-observer.mjs | source campaign on upstream-only code | KEEP | owner Q: move upstream |
| launcher-ownership.md | harness doc | MERGE | header |
| launcher-ownership.mjs | source campaign on upstream-only code | KEEP | narrow manifest sources; owner Q: upstream |
| list-focus-notes.md | harness doc with tombstone | MERGE | 2 lines into list-focus.mjs header |
| list-focus.mjs | whole-file transplant + marker | PORT | import `createKeyedListFocus` |
| map-plane-ownership.mjs | ITF replay on concatenated transplant | PORT | exported plane controller in `maps/map-plane.ts` |
| maps-event-return.md | harness doc | MERGE | header |
| maps-event-return.mjs | transplant + marker | PORT | exported return controller in `runtime/maps-event-return.ts` |
| maps-reroute-ownership.md | harness doc with history narrative | MERGE | header (trimmed) |
| maps-reroute-ownership.mjs | Chromium, production renderer, real controls | KEEP | move 4 helpers out of `specs/quint/legacy` |
| maps-share-choice.mjs | ITF replay on tail-slice transplant | PORT | `prototype/maps-chat-adapter.ts` module |
| media-copy-intent.mjs | ITF replay importing real module | KEEP | delete `rewrite` hook + mutation test |
| modal-scrim-ownership.md | harness doc with history narrative | MERGE | header (trimmed) |
| modal-scrim-ownership.mjs | projection of a Chromium fixture | KEEP | delete duplicate host test; drop `checkClientFeatures()` |
| modal-toast-forwarding.mjs | whole-file transplant | PORT | `sourceModule`; drop unexecuted main.tsx/template.html pins |

Counts: KEEP 7 (incl. hosted-digest-mutation, three launcher harnesses, maps-reroute, media-copy, modal-scrim),
PORT 11, REWRITE 1 (index), MERGE 9 (.md notes), DELETE 0.

## Behaviours that would lose coverage
No DELETE in this chunk, but two ordering hazards:
- `keyboard-focus.mjs` and `modal-scrim-ownership.mjs` run **only** through the aggregate `index.mjs`; deleting the
  aggregate (T4) before a manifest runner or per-model wrapper exists drops KeyboardFocus and ModalScrimOwnership
  refinement entirely. Deleting `test/modal-scrim-ownership.test.mjs` at the same time would leave the scrim
  behaviour with no execution at all.
- `map-plane-ownership.mjs`, `maps-share-choice.mjs`, `media-copy-intent.mjs` run **only** through their per-model
  wrappers; deleting wrappers in favour of the aggregate drops them, and they never get the aggregate's state/action
  coverage check.
- The coverage check itself (`collectApplicationCampaigns`: unobserved state fields, unexecuted actions) exists only in
  `index.mjs`; it must move into the replacement runner.

## Shared helpers worth keeping / consolidating
- `support.mjs` (`bundledSource`, `sourceModule`, `trace`, `checkpoint`, `boundInputs`, `deferred`, `tick`) — the port
  target. `sourceContext` should disappear once its callers (here: hosted-background-admission) port.
- Proposed new: `hosted-digest-panel.mjs` (Chromium mount + port map; 5 importers today), `maps-support.mjs` (moved from
  `specs/quint/legacy/maps/check-maps-refinement.mjs`), shared `homeHost()` (home-failure-notice + home-gesture),
  one ITF replay module merging `services/maps-model-traces.mjs` and `notes-files-media-itf.mjs`.
- Local `tick` copies in map-plane-ownership.mjs:29 and maps-share-choice.mjs:22 → import from `support.mjs`.

## Cross-file actions
1. Add `refinement` (`file#export`) to manifest entries; one runner; delete either the 176 per-model wrappers or the
   aggregate (not both, not neither). Drop exact-count asserts (`traces === N`, `checkpoints === N`) from wrappers.
2. Product exports needed by PORTs: notice reducer + gesture controller (home-shell.ts), plane controller
   (maps/map-plane.ts), event-return controller (runtime/maps-event-return.ts), `maps-chat-adapter.ts` split,
   verified-read on `googleConnectionController` snapshot, keyboard watch (chat-overlay-motion-adapter.ts).
   These overlap the stage-F splits of `maps-adapter.ts` and `home-shell.ts`; do the port in the same change.
3. Prettier (D9) will break the tab/space-sensitive anchors in hosted-digest-refresh, keyboard-focus, list-focus,
   home-*, maps-*, google-account-panel fixture. Port these before the formatter commit.
4. Manifest source pins that do not match what runs: MapPlaneOwnership (pins stubbed map-plane.ts/cloud-maps.ts,
   misses executed maps-event-return.ts/cloud-provider.ts), LauncherOwnership (pins home-shell.ts), KeyboardFocus
   (pins MainActivity.java), ModalToastForwarding (pins main.tsx/template.html). These mis-select changed-model CI.
5. Remove index.mjs adapters for D1-deleted models (PreviousNotesAvailability, PreviousNotesSourceOpening,
   NotesTrashReadPublication) together with their models.
6. `.md` harness notes → JSDoc headers (map-plane-ownership.mjs is the example); drop counts, run lines and history.

## Owner questions
- Q-LEG-11 / Q-FORMAL-2: may the HostedDigestMutation `legacy` (phase-less) journal row be removed from model, Lemma
  contract and harness?
- Should the upstream-only launcher models (LauncherObserver, LauncherOwnership, LauncherFavorites) move to
  `vendor/eliza` CI (P6/D14)? Their harnesses patch generated `.eliza` text and break on upstream bumps.
- Keep per-model wrappers or the family aggregate as the single entry point (and run refinement per PR path-selected,
  or nightly)?
