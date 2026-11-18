# Chunk test-05: accessibility sweep, adapter wrapper, agent camera

Ten files, 3,317 lines, 867 Playwright tests (the counts come from `playwright test --list`).

| File | Lines | Tests | Kind | Verdict | Target |
|---|---|---|---|---|---|
| `test/browser/accessibility-audit.spec.ts` | 357 | 14 | test of the test helper (T5), `setContent` | DELETE | (optional canary, see Q1) |
| `test/browser/accessibility-audit.ts` | 806 | – | support: hand-built a11y rule engine | KEEP + SIMPLIFY + MOVE | `harness/a11y.ts` |
| `test/browser/accessibility-lifecycle.spec.ts` | 263 | 30 | journey (HOME, rotation, reload, offline) | MERGE | `journeys/accessibility.spec.ts` (`lifecycle`) |
| `test/browser/accessibility-resilience.spec.ts` | 761 | 52 | regression journeys, mostly mock deep links | MERGE (split by area) | `journeys/accessibility`, `home-shell`, `camera-photos`, `maps`, `settings`, `notes`, `browser` |
| `test/browser/accessibility-sign-in.production.spec.ts` | 148 | 6 | production journey | MERGE | `journeys/connection-cloud.spec.ts` (production) |
| `test/browser/accessibility-states.ts` | 543 | – | support: state catalogue + `setTextScale` | KEEP + SIMPLIFY + MOVE | `harness/states.ts`, `harness/text-scale.ts` |
| `test/browser/accessibility-sweep.production.spec.ts` | 93 | 76 | production twin of the sweep (C5/T4) | MERGE | `journeys/accessibility.spec.ts` run by the production project |
| `test/browser/accessibility-sweep.spec.ts` | 248 | 677 | sweep matrix | KEEP (reduce matrix, own project) | `journeys/accessibility.spec.ts` (`sweep`) |
| `test/browser/adapters.spec.ts` | 17 | 8 | wrapper spawning 8 scripts (T9) | DELETE | 4 scripts → journeys; 4 deleted with C4 / D1 / D3 |
| `test/browser/agent-camera-capture.spec.ts` | 81 | 4 | integration journey with page monkey-patches | MERGE | `journeys/camera-photos.spec.ts` |

Counts: KEEP 3 (the two support files and the sweep), MERGE / REWRITE 5, DELETE 2.

## Behaviours that would lose all coverage if the DELETEs happen without a replacement

- **The audit rules themselves** (deleting `accessibility-audit.spec.ts`). Nothing else proves that each rule can fire. If a
  rule regresses to "always clean", the sweep passes vacuously. Mitigation: Q1.
- **Agent context, inbox draft, maps context and bookmark recovery adapter flows** (deleting `adapters.spec.ts` before
  porting). `scripts/test-agent-context-browser.ts`, `test-inbox-drafts-browser.ts`, `test-maps-context-browser.ts` and
  `test-browser-bookmark-recovery.ts` are the only rendered-adapter coverage for these cases. Port them first, then delete.
- **Delegation return page** (`apps/app/public/delegation-return.html`). It is covered only by `test-cloud-delegation-return.ts`.
  The page must go with C4, or the test must be ported.
- **Legacy-notes rebases (not a loss if done).** About 10 sweep states and 4 resilience tests open the Older-notes source.
  They break when A2 lands. The modal-dialog toast behaviour (dialog toast on top, Undo inside the dialog, toast cleared on
  close) and render failure under a modal must be re-based on a surviving modal dialog, or that coverage is lost.

## Shared helpers worth keeping

- `accessibility-audit.ts`: the rule engine. Every a11y and large-text spec depends on it. Remove its four duplicated
  in-page geometry helpers, then move it.
- `accessibility-states.ts`: `setTextScale` (WebView text-zoom emulation, about 9 importers) and the state catalogue.
- The production text-zoom `zoomText` in `accessibility-sign-in.production.spec.ts`. It belongs beside `setTextScale` in
  `harness/text-scale.ts`.
- Helpers in `accessibility-lifecycle.spec.ts` (`focusState`, `expectScreenName`, `openFromHome`, `pressHome`). They should
  become `harness/navigation.ts`.

## Cross-file actions

1. Delete the legacy-notes states and test steps here in the same change as A2 (`helpers/legacy-notes.ts`,
   `openLegacyNotes`, `openLegacyAttachment`, `selectLegacyNotes`). Re-base on `openCanonicalNotes` and a surviving modal.
2. Delete `adapters.spec.ts` together with C4 (hosted delegation and live-source picker scripts and fixtures), D1/D3
   (`test-notes-documents-browser.ts`), and the port of the four surviving scripts into journeys.
3. Delete the host twin `test/agent-camera-capture.test.mjs` / `scripts/test-agent-camera-flow.ts` (T2 transplant) once this
   spec has moved to `camera-photos` (owned by another chunk).
4. One Capacitor bridge harness replaces `launcherBridge` (states), `PRODUCTION_APPS_STATE`'s `nativePromise` wrap, the
   `agent-camera-capture` inline bridge and `device-apps-stub.ts`.
5. Replace in-page monkey-patching (`connectMailbox` patching `connection-ui.tsx`, fibre walks to `toast`/`vset`, the
   `browserCamera` override) with boundary fixtures or dev hooks behind the `dev/` boundary. This must happen before or
   together with the `connection-ui.tsx` and `model.js` splits (stage F), or those splits break these specs.
6. CI: give the sweep its own Playwright project (`a11y-sweep`). It is the largest single Playwright cost (677 + 76 tests).
   Run it only when renderer UI, CSS or `harness/a11y.ts` change (P1).
7. Delete the dangling reference to `test/accessibility-coverage.test.mjs` and the empty `OPEN_AT_300` set (A8/A7).

## Owner questions

- Q1: The rule engine has no self-test once `accessibility-audit.spec.ts` is gone. Options: (a) delete it outright, accepting
  vacuous-pass risk; (b) keep one seeded-defect canary per rule family, run only when `harness/a11y.ts` changes; (c) adopt
  `@axe-core/playwright` for names, ARIA and contrast, and canary only the product-specific rules (dock, reading order, tab walk).
- Q2: Should 200% text also run in the production project, now that a production text-zoom helper exists? That would let
  the dev 200% lane shrink to dev-only states.
- Q3: Do the hosted `CloudDelegationPanel`, `HostedLiveSourcePicker` and `delegation-return.html` survive C4? If they are
  deleted, their two adapter scripts and fixtures go with them. If not, they need a journey.
- Q4: Is the "Local development agent" pairing form (Connection diagnostics) retained as the dev harness for agent-turn
  journeys (`agent-camera-capture`, the development-agent sweep states)? D5 keeps it only while retained e2e specs need it.
