# apps/app/src/prototype/development-system-surfaces.html
- Lines: 39 | Role: Test-mocks-only simulated system surfaces of the browser prototype (lock screen, screen-off "Wake" button, boot splash, simulated status bar), spliced into `template.html` at `<!-- alpha-development-system-surfaces -->` (`template.html:4564`) by `template-source.ts:4,10` only when `testMocksEnabled`. | Verdict: MOVE to `apps/app/src/dev/`
- Importers: `template-source.ts:4` (`?raw`). Text/path pins: `specs/quint/application/manifest.json:8060-8064` (ShellScreen.qnt pins the marker attribute `data-alpha-development-lock-screen` in this path, T10); `test/quint-shell-screen.test.mjs:14`, `test/aosp-secure-camera-policy.test.mjs:63`, `test/theme-palette.test.mjs:10`, `test/voice-in-chat-only.test.mjs:30` (read the text).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-39 | D6 | Dev-only markup in the product renderer folder | Move to `apps/app/src/dev/` with the rail and fixtures; update `template-source.ts`, the ShellScreen manifest path and the four tests | Low |
| 2 | 1-39 | A5 | The bound values `isLock`, `isOff`, `isBoot`, `bootMark*`, `bootTag`, `showStatus`, `sbColor`, `sbWifi`, `sbPlane`, `micLive`, `unlock`, `wake` are computed in production `model.js renderVals` (`:5854`) for markup that production never contains | Gate their computation behind `testMocksEnabled` (or a dev installer) together with the rail values | Low; `isLock`/`screen` state may be read elsewhere in production — check per key |
| 3 | 2-36 | D12 | Inline styles throughout | Leave (dev-only) | None |

## Proposed end state
Unchanged markup (39 lines) at `apps/app/src/dev/development-system-surfaces.html`; its values come from a dev-only installer.

## Verification
`test/quint-shell-screen.test.mjs` (ShellScreen manifest), `test/aosp-secure-camera-policy.test.mjs`, `test/voice-in-chat-only.test.mjs`, `test/theme-palette.test.mjs`, production bundle audit.
