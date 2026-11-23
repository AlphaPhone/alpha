# Chunk specs-11: `specs/quint/legacy` historical models, README, view-refresh runner, ChatInput replay

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| specs/quint/legacy/Maps.qnt | 165 | historical Quint design model | DELETE (C17) | live: services/MapsConnection, MapsGuidanceVoice; application/Maps* |
| specs/quint/legacy/NotesView.qnt | 217 | historical TLA translation (view-refresh) | DELETE (C17) | live: application/CanonicalNotes*, NotesLifecycle |
| specs/quint/legacy/PhotosLibrary.qnt | 198 | historical TLA translation (view-refresh) | DELETE (C17) | live: application/PhotosWindow, PhotosTrash |
| specs/quint/legacy/README.md | 214 | docs | DELETE (C17) | drop Legacy row in specs/quint/README.md:13 |
| specs/quint/legacy/SettingsNav.qnt | 379 | historical Quint design model (mostly a row inventory) | DELETE (C17) | behaviour to journeys/settings.spec.ts |
| specs/quint/legacy/SignIn.qnt | 171 | historical Quint design model | DELETE (C17) | live: services/IdentitySession, application/SignInChooser |
| specs/quint/legacy/chat-input/README.md | 18 | docs, unreferenced | DELETE | — |
| specs/quint/legacy/chat-input/check-chat-input-refinement.mjs | 354 | refinement harness (Vite + Chromium replay, text-anchored on main.tsx) | DELETE; carry 2 cases | journeys/chat.spec.ts (or home-shell) |
| specs/quint/legacy/check-view-refresh.mjs | 125 | script, no caller | DELETE | — |

All nine files are self-declared historical ("current design is source `ef9fbf7cd7`", "not a runtime conformance
claim"). None of them is one of the C17 prerequisites (those are `legacy/core/source-support.mjs`,
`legacy/core/formal-source-inventory.mjs`, `legacy/CoreTaskScheduler.qnt`), so they can go in the same commit as the
rest of `specs/quint/legacy/**` once those three are relocated. Grep results for callers are in each report.

## Behaviours that lose coverage
- IME (viewport) hide blurs the raised app composer, then a delivered Back lowers it to the pill keeping the draft,
  and the next Back leaves the view. `full-chat-grabber.spec.ts:242` covers the Back ordering but not the
  keyboard-resize step. Needs a case in `journeys/chat.spec.ts`.
- Upward Home content drag does not open chat while a dock drag opens the sheet. No dedicated Playwright test found.
  Needs a case in `journeys/chat.spec.ts` or `journeys/home-shell.spec.ts`.
- Settings navigation (sub-page, Back pops one level, destructive row confirms): the formal audit says only the
  legacy model touches it. Confirm `journeys/settings.spec.ts` asserts it.
- Nothing else: Maps, Notes, Photos and Sign-in current behaviour is modelled by live application/services models;
  the legacy models describe superseded designs and their refinement tests assert mismatches.

## Shared helpers worth keeping
- `scripts/quint-lib.ts` `sha256`, `detectedCounterexample`, `filesWithin` (other live users).
- `test/browser/flag-off-android.ts`, `test/browser/resident-stub.ts`, `specs/quint/refinement/check-traces.mjs`
  (live importers remain).

## Cross-file actions
- Delete with these: `test/fixtures/quint/{Maps,NotesView,PhotosLibrary,SettingsNav,ChatInputCurrent}Comparison.qnt`,
  `specs/quint/legacy/{maps,notes-view,photos-library,settings-nav,sign-in}/**`,
  `test/quint-legacy-{maps,notes-view,photos-library,settings-nav,sign-in,chat-input}-refinement.test.mjs`,
  `specs/quint/refinement/legacy/index.mjs`, `legacy/view-refresh-configurations.json`, the legacy part of
  `test/quint-tla-inventory.test.mjs:13`, the legacy floor in `test/quint-checker.test.mjs:32`.
- Remove `'legacy'` from the family lists: `scripts/quint-lib.ts:43,227`, `scripts/check-quint.ts:42`,
  `scripts/check-quint-refinement.ts:67,82,152,195-201`, `scripts/check-changed-models.ts:20`.
- `apps/app/src/main.tsx:329` loses its `shell = value;` text pin (needed before Prettier, D9).
- Formal audit 06 C3 (sign-in email cooldown stamped before send) stays an open product bug; the legacy SignIn
  scenario was its only reference.

## Owner questions
- Is a current Quint model of Settings navigation wanted once `legacy/SettingsNav.qnt` is gone, or is a Playwright
  journey enough?
- Confirm that no external record depends on the `test-results/quint-legacy/` and `quint-view-refresh/` receipts the
  legacy README cites (they are untracked).
