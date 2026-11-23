# test/fixtures/modal-scrim-chromium.mjs
- Lines: 237 | Kind: Chromium driver for a Quint refinement + host test (bundles three real product modules, mounts them on a fake `Shell` class and synthetic DOM, drives 15 pointer/keyboard schedules) | Verdict: KEEP for the live model while the adapter pattern exists; REWRITE the host-test use as a Playwright journey; flag the fake `Shell` (T6/D2)
- Covers: a modal (inline Calendar month dialog or native `<dialog>`) opened while a raised-composer scrim press is held retires that press and its compatibility click fallback, keeps the draft, moves focus to the modal and does not activate the underlay. Duplicates: partly `test/browser/accessibility-resilience.spec.ts` / `home-assistant-surface.spec.ts` (scrim behaviour in the real app). Callers/importers: `specs/quint/refinement/application/modal-scrim-ownership.mjs` (live, `application/index.mjs:39`), `test/modal-scrim-ownership.test.mjs` (46 lines, Chromium launched from `npm test`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-19 | — | Imports real `installChatOverlayMotion`, `installCalendarMonthFocus`, `holdPhoneInert` through esbuild (no text slicing). Good. | Keep. | None. |
| 2 | 76-89, 90-98 | T6, D2 | A hand-written `Shell` class (state, `renderVals`, `setState`, lifecycle stubs) and a fake `views.calendar` stand in for the prototype shell; the adapters monkey-patch it. When D2 replaces `install*Adapter` with a hook registry, this fake must be rewritten. | Accept as the port for now; on the D2 refactor, mount the real composition instead. | Medium. |
| 3 | 54-63 | T6 | Synthetic HTML with absolute coordinates instead of the real phone layout; tests geometry the app does not have. | Journey version should use the real app (`journeys/home-shell.spec.ts`). | Low. |
| 4 | 20-27 | B5 | `onInputs` builds once to get the metafile, reports inputs, then builds again. Double esbuild for the harness's input capture. | Use the first build's output. | None. |
| 5 | 32-48, 176-231 | D9 | Fifteen schedule names decoded by `startsWith`/`includes`/`endsWith` substrings into behaviour flags (`ordinary`, `touch`, `samePointer`, `delayed`). | Table `name → {press, open, early, release, wait}`. | Low. |
| 6 | 29, 50 | T4/T9 | `npm test` launches real Chromium from `node:test` (tests-host.md item 20); the same driver also runs under the Quint aggregate. | Delete `test/modal-scrim-ownership.test.mjs`; its assertions become model invariants or a journey. | Low. |
| 7 | 52-53, 210, 221 | T8 | Uses `page.clock` with fixed run-for values (120, 251, 351 ms) that encode adapter timeouts. | Export the timeout constants from the adapters and reference them. | Low. |

## Proposed end state
Moves beside its harness (`specs/quint/refinement/application/fixtures/modal-scrim-chromium.mjs`), single build,
schedule table, timeout constants imported from the adapters. Host test deleted; cases worth carrying into
`journeys/home-shell.spec.ts`: hold a scrim press, open the Calendar month dialog with Enter, release: the dock stays
raised, draft kept, focus in the dialog, underlay not activated. Rewrite the fake `Shell` when D2 lands.
