# apps/app/src/prototype/home-shell.ts
- Lines: 306 | Role: Installs Home (shared `MobileHomeScreen` grid), the Apps drawer (`InstalledAppsGridDrawer`), Home edit mode (long-press, drag-reorder, remove, "+" restore sheet) and launcher-aware Back/Home/openView over the prototype shell. | Verdict: SIMPLIFY (KEEP structure)
- Importers: `main.tsx:81,192` (return value ignored). Return value (`shell`) used by `test/home-shell.test.mjs`, `test/quint-back-dispatch.test.mjs:59`, `specs/quint/refinement/application/{drawer-interaction-fixture.tsx:84,home-failure-notice.mjs:77,home-gesture.mjs:89}`. `AppInfoOpener` is used only here.
  Text/path pins: `specs/quint/application/manifest.json:570,613,1941,1965,1987,2231,2302,2346,7758-7788` (BackDispatch.qnt pins the strings `p.back`, `closeEdit`, `openAllApps` in this file, T10); `specs/quint/refinement/application/home-gesture.mjs:16` (re-exports by path), `drawer-interaction-fixture.tsx:4`, `home-failure-notice.mjs:49`; `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs`; `test/accessibility-coverage.test.mjs`, `test/browser/canonical-icons.spec.ts`, `test/browser/gmail-mvp-scope.spec.ts`, `test/product-identity.test.mjs:139` (regex on the `installHomeShell(Component,…` call in `main.tsx`); `template.html:31` binds `{{homeEditStyle}}`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-26, 262, 298 | D12 | `HOME_EDIT_CSS` (wiggle animation, drag shadow, remove badge) is a CSS string rendered as a `<style>` React element on every render and bound via `{{homeEditStyle}}` | Move the rules into `phone.css`; delete `HOME_EDIT_CSS`, `homeEditStyle` and the `{{homeEditStyle}}` template hole | Low visual |
| 2 | 13-16, 296 | C3 | Two hand-built mask helpers in one file: `glyph(url,size)` and the inline string `mask:url('${url \|\| grid}') center/contain no-repeat;-webkit-mask:…` (296); both twin `icon-style.ts iconStyle` and `home-overview-cards.ts maskIcon` | Use `glyph()` for 296 (return an object; template binds style objects through dc-lite) or a shared `maskStyle(url,size)` next to `iconStyle` (these are URLs from `mobileShellIconUrl`, not catalog names, so `iconStyle` itself does not fit) | Low |
| 3 | 121, 129, 144, 146, 148, 285 | B2 | `mount?.apply`, `unmount?.apply`, `back?.apply`, `goHome?.apply`, `openView?.apply`, `self.toast?.(…)` — all exist on `Component.prototype` | Call directly (or via the hook registry, P1) | None |
| 4 | 94, 99 | B2 / B4 | `(target as Element \| null)?.closest?.(…)` (closest always exists on Element); `tile.isConnected !== false` (boolean, never undefined) | `target instanceof Element ? target.closest(…) : null`; `tile.isConnected` | None |
| 5 | 98, 138, 150 | B2 | `self.props?.assistantSurface` / `this.props?.assistantSurface` — React components always have `props` | `this.props.assistantSurface` | None |
| 6 | 35-49 | D7 | Options `favorites` ("tests only") and `storage` exist only for tests/harnesses; `main.tsx:192` never passes them. The function returns `shell` only for tests | Keep `storage`/`favorites` injection only if the Quint harnesses need it; otherwise tests use a real `localStorage` (jsdom) and the options plus `return shell` go | Low; touches `test/home-shell.test.mjs` and three Quint harnesses |
| 7 | 28-34 | A8 | Comment cites "view refresh PLAN section 5" — `PLAN.md` does not exist in the repo | Delete the reference | None |
| 8 | 6 | D13 | Deep relative import `../../../../.eliza/client-features/packages/ui/src/mobile-shell/InstalledAppsGridDrawer` beside the alias `@elizaos/ui/mobile-shell` used on line 4 (the alias's `index.ts` does not export the drawer) | Export `InstalledAppsGridDrawer`, `HOLD_MS`, `SLOP`, `appsDrawerEntries` upstream from the mobile-shell index (upstream change), then import via the alias | Low (upstream PR) |
| 9 | 50-52, 89-91, 117 | D3 / D2 | Module-level `owner`, `press`, `drag`, `swallow`, `stop` capture the live shell (singleton assumption, research P6); five prototype methods patched | Per-shell state object created in the mount hook; hook registry | Medium; BackDispatch manifest pins `p.back`/`closeEdit` text |
| 10 | 153-304 | D9 / D1 | `renderVals` wrapper is 150 lines: tile building, an 75-line `gridProps` gesture handler set, drawer props, edit-sheet model | Extract `homeGridGestures(ctx)` (180-254) and `appsDrawerElement(ctx)` (264-292) as named functions in the same file | Low; harnesses drive behaviour, not text, except the BackDispatch symbol pins |
| 11 | 169 | D10 | `['phone', 'messages', 'inbox'].includes(key)` hard-codes which views may show a Home badge; `typeof definition.badge === 'function'` already says whether a view has one | Keep the allow-list behaviour but state it once: delete the prototype `badge` hooks of views that must not badge (`model.js:1234` calendar, `:3933` wallet, `:4341` workflows — calendar/workflows badges would otherwise appear) and then drop the list | Medium: dropping the list alone would make Calendar and Workflows show badges |
| 12 | 211 | B1 | `try { …setPointerCapture… } catch { /* Synthetic pointers cannot be captured. */ }` | Keep (specified, commented) | — |
| 13 | 8, 35, 52, 96, 133 | C1 | `Bag`, `Component: any`, `owner: any`, `self: any` | `ShellHost` | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 8 | ~60 files | `shell-types.ts` |
| `AppInfoOpener` | type | 11 | `openAppInfo` signature in `main.tsx` / `runtime` | stays (or with `openAppInfo`) |
| `glyph` | helper | 13-16 | `home-overview-cards.ts maskIcon`, `icon-style.ts iconStyle`, 5 more mask builders | shared `maskStyle` beside `iconStyle` |
| `HOME_EDIT_CSS` | const | 17-26 | none | `phone.css` |
| `reportHomeFailure`, `place`, `remove`, `closeEdit`, `openMenu`, `ownsHomeGesture`, `focusTile`, `tileOf`, `keyOf` | helper | 55-133 | none | stays |

## Proposed end state
~280 lines: CSS moved to `phone.css`, one mask helper, no `?.` on own methods/props, the stale PLAN reference gone, gesture handlers and drawer element extracted into named functions. Test-only options/return value go if harnesses can use jsdom storage. Persisted favorites (`alpha.launcher.favorites.v1`, owned upstream) untouched.

## Verification
`test/home-shell.test.mjs`, `test/quint-back-dispatch.test.mjs` (BackDispatch manifest symbols), Quint harnesses `home-gesture.mjs`, `home-failure-notice.mjs`, `drawer-interaction.mjs` (Chromium), `test/accessibility-coverage.test.mjs`, `test/browser/canonical-icons.spec.ts`, Home/drawer browser specs, Android build + emulator HOME-role test for the launcher (separate from APK build evidence).
