# apps/app/src/browser/browser-surface.ts
- Lines: 82 | Role: web implementation of the `AlphaBrowser` plugin: sandboxed iframe tabs, history, presentation geometry, bookmarks and browsing-session persistence. | Verdict: KEEP (minor)
- Importers: 1 (`browser/register.ts:16,39`). Text/path pins: `specs/quint/application/manifest.json:332,429,5239,5281-5285,5678-5706` (symbols incl. `setBookmark`, `bookmarks`), `specs/quint/refinement/application/browser-surface-navigation.mjs`, `test/agent-always-local.test.mjs`, `test/browser/browser-signins.spec.ts`, `test/browser/preference-storage-migration.spec.ts` (A1), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-22, 29 | B4 | `position:${host?'absolute':'fixed'}` and `(host??document.body)` — `[data-alpha-browser-surfaces]` is always in `prototype/template.html:4233`. | Require the host (`document.querySelector(...)!`), drop the body/fixed fallback. | Low (check Browser specs that boot without the template) |
| 2 | 12 | C3 | `address()` HTTP(S)-only URL check duplicates `daily.ts:173` (`perform` browser action). | Export one `httpAddress(raw)` and use it in both. | None |
| 3 | 22, 26-28 | D12 | Inline `style.cssText` for container, frame, link and status. | Move to a CSS class in the Browser stylesheet. | Low |
| 4 | 78, 81 | — | `clearSiteData` always throws; `cancelReading` is empty — both are plugin-interface members the native side implements. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Tab` | type | 6 | Tab state in `prototype/browser-adapter.ts` | keep |
| `address()` | helper | 12 | `daily.ts:173` inline URL check | shared `httpAddress` |

## Proposed end state
~78 lines; host required; one shared HTTP(S) address check; styles in CSS.

## Verification
Quint `browser-surface-navigation` refinement, `test/browser/browser-signins.spec.ts`, Browser journey specs.
