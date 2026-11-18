# test/shell-navigation-detent.test.mjs
- Lines: 93 | Kind: transplant (slices `goHome`..`back()` methods out of `prototype/model.js` into a fake `Shell` class in `vm`; regex-extracts `backToApps`; real upstream reducer via `tsImport` from `.eliza/client-features`) | Verdict: REWRITE as `journeys/home-shell.spec.ts` cases
- Covers: Back lowers the assistant one detent (full > sheet > input/pill) before leaving a view; Home and view changes set the destination's rest detent and keep the unsent draft. Duplicates: `test/browser/chat-header-home.spec.ts`, `chat-voice-mode.spec.ts`, `composer-send-focus.spec.ts` (partial: Home/draft), `app-navigation.ts` helper. Callers/importers: `npm test` glob only; `ALPHA_SHELL_MODEL_SOURCE` knob nothing sets.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14, 88 | T2/T9 | Slices `model.js` at `  goHome(chat) {` and `\n  }\n` and regexes a one-line `backToApps`; the D1 `model.js` split breaks it. Env knob unused. | Delete. | Low |
| 2 | 16-32 | T3 | Fake `Shell` re-implements `defaultChat`, `rest`, `mod`. | Delete. | Low |
| 3 | 41-83 | T2 | Detent sequence on Back and drawer layering are user-visible and worth one journey each. | Carry: (a) Notes > open Browser full > Back x4 ends at Home; (b) drawer + full chat + listening: Back stops voice, lowers chat, then closes drawer; (c) Home from a sheet keeps the draft. | Med |

## Proposed end state
File deleted. Three cases in `journeys/home-shell.spec.ts` driven by real key presses (`alpha-back` / Escape) and taps, asserting
the visible assistant state; the upstream reducer is upstream's to unit-test.
