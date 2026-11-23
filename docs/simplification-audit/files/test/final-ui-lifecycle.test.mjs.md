# test/final-ui-lifecycle.test.mjs
- Lines: 116 | Kind: transplant (slices `prototype/model.js`, `prototype/data-adapter.ts`, `prototype/subview-accessibility.ts`, `prototype/settings-adapter.ts`, `prototype/chat-overlay-motion-adapter.ts` between literal markers, strips types, runs in `vm` with jsdom or hand-made globals) + one source-text regex | Verdict: DELETE
- Covers: Settings Back restores focus, Home widget visibility, the screen-reader reply announcer, Settings row identity and nested Back, keyboard hide/background releasing composer focus without touching the draft, native Back with unchanged viewport, voice IME handoff, About's Connection help row. Duplicates: Quint `specs/quint/refinement/application/settings-page-focus.mjs` (`stPageAccess`); Playwright `chat-reply-announcement.spec.ts` (announcer), `full-chat-grabber.spec.ts` and `own-provider.production.spec.ts` (`alpha-keyboard-visibility`), `settings.production.spec.ts`, `one-calendar.spec.ts` (Home cards). Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 7, 14, 23, 35, 40, 44-45, 59, 79, 96, 106, 112 | T2 | Eleven marker slices (`'var stPageFocus ='`, `'    // Stable identities keep focused controls attached'`, `'\t\tconst free = keyboardFreeHeight();'`, ...). Whitespace-exact markers make every formatter run and file split (U-split of `model.js`, `chat-overlay-motion-adapter.ts` → `runtime/chat-release.ts`) fail. | Delete. | Low |
| 2 | 111 | T1 | `assert.match(s,/group\(\[connectionHelpRow\(\),licensesRow\(\)\]\)/)` on settings-adapter text. | Delete. | Low |
| 3 | 40, 113 | A3 | Stubs `PASSWORD_PAGES`, `leavePasswordManager`, `leavePasswordEntry`: password import/export pages are deleted by D3. | Goes with the file. | Low |
| 4 | 55-103 | coverage | Native Back releasing a still-focused composer when the viewport does not change, and the voice IME handoff, are driven by the `alpha-keyboard-visibility` window event that only Android sends. | Keep as journey cases in `journeys/chat.spec.ts` that dispatch that event through the test-mocks native bridge fake (the same path `full-chat-grabber.spec.ts` uses). | Medium |

## Proposed end state
File deleted. Carry three cases into journeys: composer focus released on Back with an unchanged viewport and draft
plus selection kept (`journeys/chat.spec.ts`), voice keyboard handoff keeps the composer until dismissed
(`journeys/voice.spec.ts`), About → Status opens Connection help and Back returns to About
(`journeys/settings.spec.ts`). Settings focus restore stays with the settings-page-focus Quint model (ported to an import).
